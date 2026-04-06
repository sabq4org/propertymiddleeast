import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  // Mask password for safety
  let maskedUrl = "NOT SET";
  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      u.password = "***";
      maskedUrl = u.toString();
    } catch {
      maskedUrl = "INVALID URL FORMAT";
    }
  }

  const info: Record<string, unknown> = {
    hasDbUrl: !!dbUrl,
    maskedUrl,
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  };

  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      const result = await sql`SELECT 1 as test`;
      info.dbConnection = "SUCCESS";
      info.testResult = result;
      
      // Try to count tasks
      try {
        const count = await sql`SELECT COUNT(*)::int as count FROM pme_tasks`;
        info.taskCount = count[0].count;
      } catch (e: unknown) {
        info.taskCountError = e instanceof Error ? e.message : String(e);
      }
    } catch (e: unknown) {
      info.dbConnection = "FAILED";
      info.dbError = e instanceof Error ? e.message : String(e);
      info.dbErrorStack = e instanceof Error ? e.stack : undefined;
    }
  }

  return NextResponse.json(info);
}
