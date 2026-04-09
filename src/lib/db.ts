import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function query(text: string, params?: unknown[]) {
  if (params && params.length > 0) {
    return await sql.query(text, params as (string | number | boolean | null | undefined)[]) as Record<string, unknown>[];
  }
  return await sql.query(text) as Record<string, unknown>[];
}
