import { pool } from "../../../config/database.js";

export async function createRepositoryFiles(repositoryId, files) {
  if (!files.length) {
    return [];
  }

  const values = [];
  const placeholders = [];

  files.forEach((file, index) => {
    const offset = index * 8;

    placeholders.push(
      `(
        $${offset + 1},
        $${offset + 2},
        $${offset + 3},
        $${offset + 4},
        $${offset + 5},
        $${offset + 6},
        $${offset + 7},
        $${offset + 8}
      )`,
    );

    values.push(
      repositoryId,
      file.relativePath,
      file.fileName,
      file.extension,
      file.fileType,
      file.language,
      file.sizeBytes,
      file.lineCount,
    );
  });

  const query = `
    INSERT INTO repository_files (
      repository_id,
      relative_path,
      file_name,
      extension,
      file_type,
      language,
      size_bytes,
      line_count
    )
    VALUES ${placeholders.join(",")}
    ON CONFLICT (repository_id, relative_path)
    DO UPDATE SET
      file_name = EXCLUDED.file_name,
      extension = EXCLUDED.extension,
      file_type = EXCLUDED.file_type,
      language = EXCLUDED.language,
      size_bytes = EXCLUDED.size_bytes,
      line_count = EXCLUDED.line_count,
      updated_at = NOW()
    RETURNING
      file_id,
      repository_id,
      relative_path,
      file_name,
      extension,
      file_type,
      language,
      size_bytes,
      line_count;
  `;

  const { rows } = await pool.query(query, values);

  return rows;
}

export async function findRepositoryFiles(repositoryId) {
  const query = `
    SELECT
      file_id,
      repository_id,
      relative_path,
      file_name,
      extension,
      file_type,
      language,
      size_bytes,
      line_count
    FROM repository_files
    WHERE repository_id = $1
    ORDER BY relative_path;
  `;

  const { rows } = await pool.query(query, [repositoryId]);

  return rows;
}

export async function findAnalyzableFiles(repositoryId) {
  const query = `
    SELECT
      file_id,
      repository_id,
      relative_path,
      file_name,
      extension,
      file_type,
      language,
      size_bytes,
      line_count
    FROM repository_files
    WHERE repository_id = $1
      AND analysis_status = 'pending'
      AND file_type IN ('source', 'test')
      AND language IS NOT NULL
    ORDER BY relative_path;
  `;
  const { rows } = await pool.query(query, [repositoryId]);

  return rows;
}


export async function updateFileAnalysisStatus(
  fileId,
  status,
  error = null,
) {
  const query = `
    UPDATE repository_files
    SET
      analysis_status = $1::varchar,
      analysis_error = $2::text,
      analyzed_at = CASE
        WHEN $1::varchar = 'completed' THEN NOW()
        ELSE analyzed_at
      END,
      updated_at = NOW()
    WHERE file_id = $3::uuid;
  `;

  await pool.query(query, [
    status,
    error,
    fileId,
  ]);
}