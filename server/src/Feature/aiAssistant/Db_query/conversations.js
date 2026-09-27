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

  console.log(conversationId)

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
