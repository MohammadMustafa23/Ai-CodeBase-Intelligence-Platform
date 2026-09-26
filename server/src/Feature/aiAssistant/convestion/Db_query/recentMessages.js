import { pool } from "../../../../config/database.js";
export async function getRecentMessages(conversationId, limit = 10) {
  const result = await pool.query(
    `
        SELECT
            message_id,
            conversation_id,
            role,
            content,
            created_at
        FROM conversation_messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC, message_id DESC
        LIMIT $2
        `,
    [conversationId, limit],
  );

  return result.rows.reverse();
}
