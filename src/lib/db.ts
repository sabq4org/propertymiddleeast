import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Node.js environments
neonConfig.webSocketConstructor = ws;

// Use fetch via Pool for better performance in serverless
neonConfig.poolQueryViaFetch = true;
// Use secure WebSocket (port 443) - works even when port 5432 is blocked
neonConfig.useSecureWebSocket = true;

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
    pool = new Pool({ connectionString: getConnectionString() });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  const result = await p.query(text, params);
  return result.rows;
}
