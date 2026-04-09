import { neon } from "@neondatabase/serverless";

function getConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  // Remove channel_binding parameter which causes issues in some serverless environments
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    // If URL parsing fails, do a simple string replacement
    return raw.replace(/[&?]channel_binding=[^&]*/g, "");
  }
}

const sql = neon(getConnectionString());

export async function query(text: string, params?: unknown[]) {
  if (params && params.length > 0) {
    return await sql.query(text, params as (string | number | boolean | null | undefined)[]) as Record<string, unknown>[];
  }
  return await sql.query(text) as Record<string, unknown>[];
}
