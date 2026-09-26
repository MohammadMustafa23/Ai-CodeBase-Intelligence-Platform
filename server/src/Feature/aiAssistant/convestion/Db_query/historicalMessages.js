async function searchHistoricalMessages({
  pool,
  conversationId,
  query,
  limit = 10,
}) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("A valid PostgreSQL pool is required");
  }

  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  if (typeof query !== "string" || query.trim().length === 0) {
    return [];
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
    throw new RangeError("limit must be between 1 and 50");
  }

  const sql = `
        SELECT
            message_id,
            conversation_id,
            role,
            content,
            created_at
        FROM conversation_messages
        WHERE conversation_id = $1
          AND to_tsvector('simple', content)
              @@ plainto_tsquery('simple', $2)
        ORDER BY
            ts_rank(
                to_tsvector('simple', content),
                plainto_tsquery('simple', $2)
            ) DESC,
            created_at DESC
        LIMIT $3;
    `;

  const values = [conversationId, query.trim(), limit];

  const result = await pool.query(sql, values);

  return result.rows;
}

export { searchHistoricalMessages };
