import { pool } from "../../../config/database.js";

const MAX_EMBEDDING_ATTEMPTS = 3;

/**
 * Claim the next maximum 50 chunks.
 *
 * Eligible chunks:
 * 1. pending chunks
 * 2. stale processing chunks
 * 3. failed chunks whose retry time has arrived
 */
export async function claimEmbeddingChunks({ repositoryId, limit = 50 }) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  const query = `
    WITH candidates AS (
      SELECT chunk_id
      FROM code_chunks
      WHERE repository_id = $1::uuid

        AND (
          embedding_status = 'pending'

          OR (
            embedding_status = 'processing'
            AND (
              embedding_started_at IS NULL
              OR embedding_started_at < NOW() - INTERVAL '15 minutes'
            )
          )

          OR (
            embedding_status = 'failed'
            AND retry_at IS NOT NULL
            AND retry_at <= NOW()
            AND embedding_attempts < $3::integer
          )
        )

      ORDER BY chunk_id ASC

      LIMIT $2::integer

      FOR UPDATE SKIP LOCKED
    ),

    claimed AS (
      UPDATE code_chunks cc
      SET
        embedding_status = 'processing',
        embedding_started_at = NOW(),
        embedding_attempts = cc.embedding_attempts + 1,
        embedding_error = NULL,
        retry_at = NULL,
        updated_at = NOW()
      FROM candidates c
      WHERE cc.chunk_id = c.chunk_id
      RETURNING cc.*
    )

    SELECT
      claimed.chunk_id,
      claimed.repository_id,
      claimed.file_id,
      claimed.symbol_id,
      claimed.chunk_key,
      claimed.chunk_type,
      claimed.chunk_index,
      claimed.start_line,
      claimed.end_line,
      claimed.start_byte,
      claimed.end_byte,
      claimed.chunk_hash,

      claimed.embedding_status,
      claimed.embedding_model,
      claimed.embedding_version,
      claimed.embedded_at,
      claimed.embedding_error,
      claimed.embedding_started_at,
      claimed.embedding_attempts,
      claimed.retry_at,

      rf.relative_path AS file_path,
      rf.language,

      cs.symbol_name,
      cs.symbol_type,
      cs.signature,

      parent.symbol_name AS parent_symbol_name

    FROM claimed

    INNER JOIN repository_files rf
      ON rf.file_id = claimed.file_id

    LEFT JOIN code_symbols cs
      ON cs.symbol_id = claimed.symbol_id

    LEFT JOIN code_symbols parent
      ON parent.symbol_id = cs.parent_symbol_id

    ORDER BY claimed.chunk_id ASC;
  `;

  const result = await pool.query(query, [
    repositoryId,
    limit,
    MAX_EMBEDDING_ATTEMPTS,
  ]);

  return result.rows;
}

/**
 * Mark chunks completed.
 *
 * ONLY call this after Pinecone upsert succeeds.
 */
export async function markEmbeddingChunksCompleted({
  chunkIds,
  embeddingModel,
  embeddingVersion,
}) {
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
    return [];
  }

  const query = `
    UPDATE code_chunks
    SET
      embedding_status = 'completed',
      embedding_model = $2,
      embedding_version = $3,
      embedded_at = NOW(),
      embedding_started_at = NULL,
      embedding_error = NULL,
      retry_at = NULL,
      updated_at = NOW()
    WHERE chunk_id = ANY($1::uuid[])

    RETURNING chunk_id;
  `;

  const result = await pool.query(query, [
    chunkIds,
    embeddingModel,
    embeddingVersion,
  ]);

  return result.rows;
}

/**
 * Mark chunks failed.
 *
 * Retry schedule:
 *
 * Attempt 1 → +3 minutes
 * Attempt 2 → +6 minutes
 * Attempt 3 → +12 minutes
 *
 * After attempt 3 fails:
 * no retry_at → permanently failed
 */
export async function markEmbeddingChunksFailed({ chunkIds, error }) {
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
    return [];
  }

  const query = `
    UPDATE code_chunks
    SET
      embedding_status = 'failed',
      embedding_started_at = NULL,
      embedding_error = $2,

      retry_at =
        CASE
          WHEN embedding_attempts = 1
            THEN NOW() + INTERVAL '3 minutes'

          WHEN embedding_attempts = 2
            THEN NOW() + INTERVAL '6 minutes'

          WHEN embedding_attempts = 3
            THEN NOW() + INTERVAL '12 minutes'

          ELSE NULL
        END,

      updated_at = NOW()

    WHERE chunk_id = ANY($1::uuid[])

    RETURNING
      chunk_id,
      embedding_attempts,
      retry_at;
  `;

  const result = await pool.query(query, [
    chunkIds,
    error || "Unknown embedding error.",
  ]);

  return result.rows;
}



export async function getNextEmbeddingRetryAt({
  repositoryId,
}) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  const query = `
    SELECT MIN(retry_at) AS retry_at
    FROM code_chunks
    WHERE repository_id = $1::uuid
      AND embedding_status = 'failed'
      AND retry_at IS NOT NULL;
  `;

  const result = await pool.query(query, [
    repositoryId,
  ]);

  return result.rows[0]?.retry_at ?? null;
}



export async function getEmbeddingSummary({
  repositoryId,
}) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  const query = `
    SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (
        WHERE embedding_status = 'completed'
      )::integer AS completed,
      COUNT(*) FILTER (
        WHERE embedding_status = 'processing'
      )::integer AS processing,
      COUNT(*) FILTER (
        WHERE embedding_status = 'pending'
      )::integer AS pending,
      COUNT(*) FILTER (
        WHERE embedding_status = 'failed'
      )::integer AS failed,
      COUNT(*) FILTER (
        WHERE embedding_status = 'failed'
          AND retry_at IS NOT NULL
      )::integer AS scheduled_retry,
      COUNT(*) FILTER (
        WHERE embedding_status = 'failed'
          AND retry_at IS NULL
          AND embedding_attempts >= 3
      )::integer AS permanently_failed

    FROM code_chunks
    WHERE repository_id = $1::uuid;
  `;

  const result = await pool.query(query, [
    repositoryId,
  ]);

  return result.rows[0];
}