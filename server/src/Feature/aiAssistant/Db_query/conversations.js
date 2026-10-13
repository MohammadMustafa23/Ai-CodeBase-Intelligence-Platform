import { pool } from "../../../config/database.js";

/**
 * Create a new conversation.
 */
export async function createConversation({
  repositoryId = null,
  title = null,
}) {
  const query = `
    INSERT INTO conversations (
      repository_id,
      title
    )
    VALUES ($1::uuid, $2)
    RETURNING
      conversation_id,
      repository_id,
      title,
      created_at,
      updated_at;
  `;

  const result = await pool.query(query, [repositoryId, title]);

  return result.rows[0];
}

/**
 * Find a conversation by ID.
 */
export async function findConversationById(conversationId) {
  if (!conversationId) {
    throw new Error("conversationId is required.");
  }

  const query = `
    SELECT
      conversation_id,
      repository_id,
      title,
      created_at,
      updated_at
    FROM conversations
    WHERE conversation_id = $1::uuid;
  `;

  const result = await pool.query(query, [conversationId]);

  return result.rows[0] || null;
}

/**
 * Find the conversation belonging to a repository.
 *
 * One repository has one conversation.
 */
export async function getConversationByRepositoryId(repositoryId) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  const query = `
    SELECT
      conversation_id,
      repository_id,
      title,
      created_at,
      updated_at
    FROM conversations
    WHERE repository_id = $1::uuid
    LIMIT 1;
  `;

  const result = await pool.query(query, [repositoryId]);

  return result.rows[0] || null;
}

/**
 * Get all repository conversations.
 *
 * Returns one conversation per repository,
 * along with repository information and the latest message.
 */
export async function getAllConversations(userId) {
  if (!userId) {
    throw new Error("userId is required.");
  }

  const query = `
    SELECT
      c.conversation_id,
      c.repository_id,
      c.title,
      c.created_at,
      c.updated_at,

      r.owner,
      r.repository_name,
      r.github_url,

      latest_message.content AS last_message

    FROM conversations c

    INNER JOIN repositories r
      ON r.repository_id = c.repository_id

    LEFT JOIN LATERAL (
      SELECT
        cm.content
      FROM conversation_messages cm
      WHERE cm.conversation_id = c.conversation_id
      ORDER BY
        cm.created_at DESC,
        cm.message_id DESC
      LIMIT 1
    ) latest_message
      ON TRUE

    WHERE r.user_id = $1

    ORDER BY c.updated_at DESC;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}
