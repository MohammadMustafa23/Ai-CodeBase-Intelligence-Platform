import { pool } from "../../../config/database.js";

export async function createCodeChunks(chunks) {
  if (!chunks.length) {
    return [];
  }

  const values = [];
  const placeholders = [];

  chunks.forEach((chunk, index) => {
    // 11 parameters per chunk.
    const offset = index * 11;

    placeholders.push(`(
      $${offset + 1}::uuid,
      $${offset + 2}::uuid,
      $${offset + 3}::uuid,
      $${offset + 4}::varchar,
      $${offset + 5}::varchar,
      $${offset + 6}::integer,
      $${offset + 7}::integer,
      $${offset + 8}::integer,
      $${offset + 9}::bigint,
      $${offset + 10}::bigint,
      $${offset + 11}::char(64),
      NOW(),
      NOW()
    )`);

    values.push(
      chunk.repositoryId,
      chunk.fileId,
      chunk.symbolId || null,
      chunk.chunkKey,
      chunk.chunkType,
      chunk.chunkIndex ?? 0,
      chunk.startLine,
      chunk.endLine,
      chunk.startByte ?? null,
      chunk.endByte ?? null,
      chunk.chunkHash,
    );
  });

  const query = `
    INSERT INTO code_chunks (
      repository_id,
      file_id,
      symbol_id,
      chunk_key,
      chunk_type,
      chunk_index,
      start_line,
      end_line,
      start_byte,
      end_byte,
      chunk_hash,
      created_at,
      updated_at
    )
    VALUES ${placeholders.join(",")}
    ON CONFLICT (chunk_key)
    DO UPDATE SET
      repository_id = EXCLUDED.repository_id,
      file_id = EXCLUDED.file_id,
      symbol_id = EXCLUDED.symbol_id,
      chunk_type = EXCLUDED.chunk_type,
      chunk_index = EXCLUDED.chunk_index,
      start_line = EXCLUDED.start_line,
      end_line = EXCLUDED.end_line,
      start_byte = EXCLUDED.start_byte,
      end_byte = EXCLUDED.end_byte,
      chunk_hash = EXCLUDED.chunk_hash,

      embedding_status = CASE
        WHEN code_chunks.chunk_hash IS DISTINCT FROM EXCLUDED.chunk_hash
          THEN 'pending'
        ELSE code_chunks.embedding_status
      END,

      embedding_model = CASE
        WHEN code_chunks.chunk_hash IS DISTINCT FROM EXCLUDED.chunk_hash
          THEN NULL
        ELSE code_chunks.embedding_model
      END,

      embedding_version = CASE
        WHEN code_chunks.chunk_hash IS DISTINCT FROM EXCLUDED.chunk_hash
          THEN NULL
        ELSE code_chunks.embedding_version
      END,

      embedded_at = CASE
        WHEN code_chunks.chunk_hash IS DISTINCT FROM EXCLUDED.chunk_hash
          THEN NULL
        ELSE code_chunks.embedded_at
      END,

      embedding_error = CASE
        WHEN code_chunks.chunk_hash IS DISTINCT FROM EXCLUDED.chunk_hash
          THEN NULL
        ELSE code_chunks.embedding_error
      END,

      updated_at = NOW()

    RETURNING
      chunk_id,
      repository_id,
      file_id,
      symbol_id,
      chunk_key,
      chunk_type,
      chunk_index,
      start_line,
      end_line,
      start_byte,
      end_byte,
      chunk_hash,
      embedding_status,
      embedding_model,
      embedding_version,
      embedded_at,
      embedding_error;
  `;

  const { rows } = await pool.query(query, values);

  return rows;
}
