import { pool } from "../../../config/database.js";

export async function markEmbeddingsCompleted(
  chunkIds,
  { model, version } = {},
) {
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
    return 0;
  }

  const query = `
    UPDATE code_chunks
    SET
      embedding_status = 'completed'::varchar,
      embedding_model = $1::varchar,
      embedding_version = $2::varchar,
      embedded_at = NOW(),
      embedding_error = NULL,
      updated_at = NOW()
    WHERE chunk_id = ANY($3::uuid[])
      AND embedding_status = 'processing'::varchar;
  `;

  const { rowCount } = await pool.query(query, [
    model || process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
    version || "v1",
    chunkIds,
  ]);

  return rowCount;
}

export async function markEmbeddingsFailed(chunkIds, error) {
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
    return 0;
  }

  const message =
    error instanceof Error
      ? error.message
      : String(error || "Unknown embedding error.");

  const query = `
    UPDATE code_chunks
    SET
      embedding_status = 'failed'::varchar,
      embedding_error = $1::text,
      updated_at = NOW()
    WHERE chunk_id = ANY($2::uuid[])
      AND embedding_status = 'processing'::varchar;
  `;

  const { rowCount } = await pool.query(query, [message, chunkIds]);

  return rowCount;
}
