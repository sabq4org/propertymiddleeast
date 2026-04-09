import { Pool } from "pg";

function getConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  // Remove channel_binding parameter which causes issues in some environments
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return raw.replace(/[&?]channel_binding=[^&]*/g, "");
  }
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    // Log connection errors for debugging
    pool.on("error", (err) => {
      console.error("Unexpected pool error:", err.message);
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  try {
    const result = await p.query(text, params);
    return result.rows;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Provide more detail on connection errors
    if (error instanceof AggregateError) {
      const details = error.errors?.map((e: Error) => e.message).join("; ") ?? "no details";
      throw new Error(`Database connection failed: ${details}`);
    }
    throw new Error(`Database query failed: ${msg}`);
  }
}
