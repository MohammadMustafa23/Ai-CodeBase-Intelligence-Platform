import { pool } from "../../../config/database.js";

export async function findRepositoryByUrl(githubUrl) {
  const query = `
    SELECT
      repository_id,
      user_id,
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

export async function findRepositoryByUserAndUrl(userId, githubUrl) {
  const query = `
    SELECT
      repository_id,
      user_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
    FROM repositories
    WHERE user_id = $1
      AND github_url = $2
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [userId, githubUrl]);

  return rows[0] || null;
}

export async function findRepositoryById(repositoryId) {
  const query = `
    SELECT
      repository_id,
      user_id,
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
  userId,
  githubUrl,
  owner,
  repositoryName,
}) {
  const query = `
    INSERT INTO repositories (
      user_id,
      github_url,
      owner,
      repository_name
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      repository_id,
      user_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
  `;

  const values = [userId, githubUrl, owner, repositoryName];

  const { rows } = await pool.query(query, values);

  return rows[0];
}

export async function findAllRepositories() {
  const query = `
    SELECT
      repository_id,
      user_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
    FROM repositories
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query);

  return rows;
}

export async function findRepositoriesByUserId(userId) {
  const query = `
    SELECT
      repository_id,
      user_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
    FROM repositories
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows;
}

export async function findRepositoryByIdAndUser(repositoryId, userId) {
  const query = `
    SELECT
      repository_id,
      user_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
    FROM repositories
    WHERE repository_id = $1
      AND user_id = $2
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [repositoryId, userId]);

  return rows[0] || null;
}

// --------------------------------------------------
// Delete repository owned by user
// --------------------------------------------------

export async function deleteRepositoryByIdAndUser(repositoryId, userId) {
  const query = `
    DELETE FROM repositories
    WHERE repository_id = $1
      AND user_id = $2
    RETURNING
      repository_id,
      user_id,
      github_url,
      owner,
      repository_name,
      status,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(query, [repositoryId, userId]);

  return rows[0] || null;
}
