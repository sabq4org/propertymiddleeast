import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Use WebSocket for connection instead of HTTP fetch
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}
