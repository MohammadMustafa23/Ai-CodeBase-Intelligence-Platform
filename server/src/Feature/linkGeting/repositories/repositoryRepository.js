import { pool } from "../../../config/database.js";

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
