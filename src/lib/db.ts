import { Pool } from "pg";

function getPool(): Pool {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // pg v8.20+ treats sslmode=require as verify-full by default
  // Add uselibpqcompat=true to use standard libpq behavior (no cert verification)
  try {
    const url = new URL(connectionString);
    url.searchParams.set("uselibpqcompat", "true");
    connectionString = url.toString();
  } catch {
    // If URL parsing fails, append manually
    const sep = connectionString.includes("?") ? "&" : "?";
    connectionString = `${connectionString}${sep}uselibpqcompat=true`;
  }

  return new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
}

let pool: Pool | null = null;

function getOrCreatePool(): Pool {
  if (!pool) {
    pool = getPool();
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getOrCreatePool();
  const result = await p.query(text, params);
  return result.rows;
}
