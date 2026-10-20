import { pool } from "../../../config/database.js";

export async function findUserByEmail(email) {
  const query = `
    SELECT
      user_id,
      display_name,
      email,
      avatar_url,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

export async function createUser({ displayName, email, avatarUrl }) {
  const query = `
    INSERT INTO users (
      display_name,
      email,
      avatar_url
    )
    VALUES ($1, $2, $3)
    RETURNING
      user_id,
      display_name,
      email,
      avatar_url,
      created_at,
      updated_at
  `;

  const values = [displayName, email, avatarUrl];

  const { rows } = await pool.query(query, values);

  return rows[0];
}

export async function updateUser({ userId, displayName, avatarUrl, email }) {
  const query = `
    UPDATE users
    SET
      display_name = $1,
      avatar_url = $2,
      email = $3,
      updated_at = NOW()
    WHERE user_id = $4
    RETURNING
      user_id,
      display_name,
      email,
      avatar_url,
      created_at,
      updated_at
  `;

  const values = [displayName, avatarUrl, email, userId];

  const { rows } = await pool.query(query, values);

  return rows[0] || null;
}

export async function findUserById(userId) {
  const query = `
    SELECT
      user_id,
      display_name,
      email,
      avatar_url,
      created_at,
      updated_at
    FROM users
    WHERE user_id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows[0] || null;
}