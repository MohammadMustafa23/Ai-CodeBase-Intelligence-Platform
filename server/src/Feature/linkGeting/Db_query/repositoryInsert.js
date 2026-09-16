import { pool } from "../../../config/database.js";

export async function findRepositoryByUrl(githubUrl) {
  const query = `
    SELECT
      repository_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
    FROM repositories
    WHERE github_url = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [githubUrl]);

  return rows[0] || null;
}

export async function findRepositoryById(repositoryId) {
  const query = `
    SELECT
      repository_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
    FROM repositories
    WHERE repository_id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [repositoryId]);

  return rows[0] || null;
}

export async function updateRepositoryStatus(repositoryId, status) {
  const query = `
    UPDATE repositories
    SET
      status = $1,
      updated_at = NOW()
    WHERE repository_id = $2
  `;
  await pool.query(query, [status, repositoryId]);
}

export async function createRepositoryRecord({
  githubUrl,
  owner,
  repositoryName,
}) {
  const query = `
    INSERT INTO repositories (
      github_url,
      owner,
      repository_name
    )
    VALUES ($1, $2, $3)
    RETURNING
      repository_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
  `;

  const values = [githubUrl, owner, repositoryName];

  const { rows } = await pool.query(query, values);

  return rows[0];
}
