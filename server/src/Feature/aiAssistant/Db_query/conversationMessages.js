import { pool } from "../../../config/database.js";

export async function createConversationMessage({
  conversationId,
  role,
  content,
}) {
  if (!conversationId) {
    throw new Error("conversationId is required.");
  }

  if (!role) {
    throw new Error("role is required.");
  }

  if (!content || !content.trim()) {
    throw new Error("Message content is required.");
  }

  const query = `
    INSERT INTO conversation_messages (
      conversation_id,
      role,
      content
    )
    VALUES (
      $1::uuid,
      $2,
      $3
    )
    RETURNING
      message_id,
      conversation_id,
      role,
      content,
      created_at;
  `;

  const result = await pool.query(query, [
    conversationId,
    role,
    content.trim(),
  ]);

  return result.rows[0];
}

export async function getConversationMessages({ conversationId }) {
  if (!conversationId) {
    throw new Error("conversationId is required.");
  }

  const query = `
    SELECT
      message_id,
      conversation_id,
      role,
      content,
      created_at
    FROM conversation_messages
    WHERE conversation_id = $1::uuid
    ORDER BY created_at ASC;
  `;

  const result = await pool.query(query, [conversationId]);

  return result.rows;
}
