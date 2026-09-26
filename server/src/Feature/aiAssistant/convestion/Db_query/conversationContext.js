import crypto from "node:crypto";

/*
|--------------------------------------------------------------------------
| Get Stored Conversation Context
|--------------------------------------------------------------------------
*/

async function getStoredContextFromDb({ pool, conversationId }) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("A valid PostgreSQL pool is required");
  }

  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  const query = `
        SELECT
            conversation_id,
            summary,
            important_facts,
            current_topic,
            last_referenced_entities,
            unresolved_items,
            message_count,
            context_version,
            last_message_created_at,
            last_message_id,
            update_claim_id,
            update_claimed_at,
            updated_at
        FROM conversation_context
        WHERE conversation_id = $1
        LIMIT 1;
    `;

  const result = await pool.query(query, [conversationId]);
  return result.rows[0] ?? null;
}

/*
|--------------------------------------------------------------------------
| Save Conversation Context
|--------------------------------------------------------------------------
|
| Important:
| This update succeeds only if the current request still owns
| the context update claim.
|
| Successful save also releases the claim.
|
*/

async function saveConversationContext({
  pool,
  conversationId,
  context,
  messageCount,
  lastMessageCreatedAt,
  lastMessageId,
  updateClaimId,
}) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("A valid PostgreSQL pool is required");
  }

  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  if (!context || typeof context !== "object") {
    throw new TypeError("context is required");
  }

  if (!updateClaimId) {
    throw new TypeError("updateClaimId is required");
  }

  if (!Number.isInteger(messageCount) || messageCount < 0) {
    throw new TypeError("messageCount must be a non-negative integer");
  }

  if (!lastMessageCreatedAt) {
    throw new TypeError("lastMessageCreatedAt is required");
  }

  if (!lastMessageId) {
    throw new TypeError("lastMessageId is required");
  }

  const {
    summary = "",
    importantFacts = [],
    currentTopic = null,
    referencedEntities = [],
    unresolvedItems = [],
  } = context;

  if (!Array.isArray(importantFacts)) {
    throw new TypeError("importantFacts must be an array");
  }

  if (!Array.isArray(referencedEntities)) {
    throw new TypeError("referencedEntities must be an array");
  }

  if (!Array.isArray(unresolvedItems)) {
    throw new TypeError("unresolvedItems must be an array");
  }

  const query = `
        UPDATE conversation_context
        SET
            summary = $2,
            important_facts = $3::jsonb,
            current_topic = $4,
            last_referenced_entities = $5::jsonb,
            unresolved_items = $6::jsonb,

            message_count = $7,

            last_message_created_at = $8,
            last_message_id = $9,

            context_version =
                context_version + 1,

            update_claim_id = NULL,
            update_claimed_at = NULL,

            updated_at = NOW()

        WHERE conversation_id = $1
          AND update_claim_id = $10

        RETURNING
            conversation_id,
            summary,
            important_facts,
            current_topic,
            last_referenced_entities,
            unresolved_items,
            message_count,
            context_version,
            last_message_created_at,
            last_message_id,
            update_claim_id,
            update_claimed_at,
            updated_at;
    `;

  const values = [
    conversationId,
    summary,
    JSON.stringify(importantFacts),
    currentTopic,
    JSON.stringify(referencedEntities),
    JSON.stringify(unresolvedItems),
    messageCount,
    lastMessageCreatedAt,
    lastMessageId,
    updateClaimId,
  ];

  const result = await pool.query(query, values);

  /*
   * 0 rows means:
   * - claim was lost
   * - claim was taken by another process
   * - context row no longer matches
   */
  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/*
|--------------------------------------------------------------------------
| Claim Conversation Context Update
|--------------------------------------------------------------------------
|
| Creates the context row for a new conversation if necessary,
| then atomically claims it.
|
| Database transaction is intentionally SHORT.
| We do NOT call Gemini while this transaction is open.
|
*/

async function claimConversationContextUpdate({ pool, conversationId }) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("A valid PostgreSQL pool is required");
  }

  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  const client = await pool.connect();

  const claimId = crypto.randomUUID();

  try {
    await client.query("BEGIN");

    /*
     * Make sure a context row exists.
     */
    await client.query(
      `
            INSERT INTO conversation_context (
                conversation_id
            )
            VALUES ($1)
            ON CONFLICT (conversation_id)
            DO NOTHING;
            `,
      [conversationId],
    );

    /*
     * Try to acquire the claim.
     *
     * A stale claim older than 120 seconds
     * can be recovered.
     */
    const result = await client.query(
      `
            UPDATE conversation_context
            SET
                update_claim_id = $2,
                update_claimed_at = NOW()

            WHERE conversation_id = $1

              AND (
                    update_claim_id IS NULL

                    OR update_claimed_at <
                       NOW() - INTERVAL '120 seconds'
              )

            RETURNING
                conversation_id,
                update_claim_id,
                update_claimed_at,
                message_count,
                last_message_created_at,
                last_message_id;
            `,
      [conversationId, claimId],
    );

    await client.query("COMMIT");

    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/*
|--------------------------------------------------------------------------
| Release Conversation Context Claim
|--------------------------------------------------------------------------
|
| Used when Gemini/summarization fails.
|
| Only the owner of the claim can release it.
|
*/

async function releaseConversationContextClaim({
  pool,
  conversationId,
  updateClaimId,
}) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("A valid PostgreSQL pool is required");
  }

  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  if (!updateClaimId) {
    throw new TypeError("updateClaimId is required");
  }

  const query = `
        UPDATE conversation_context
        SET
            update_claim_id = NULL,
            update_claimed_at = NULL
        WHERE conversation_id = $1
          AND update_claim_id = $2;
    `;

  await pool.query(query, [conversationId, updateClaimId]);
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export {
  getStoredContextFromDb,
  saveConversationContext,
  claimConversationContextUpdate,
  releaseConversationContextClaim,
};
