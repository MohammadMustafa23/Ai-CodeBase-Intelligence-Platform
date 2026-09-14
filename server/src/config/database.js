import pg from "pg";
import { DATABASE_URL } from "./env.js";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: DATABASE_URL,

  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
