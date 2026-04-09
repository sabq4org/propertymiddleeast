import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

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

  // Test database connection
  if (dbUrl) {
    try {
      const result = await query("SELECT 1 as test");
      info.dbConnection = "SUCCESS";
      info.testResult = result;

      try {
        const count = await query("SELECT COUNT(*)::int as count FROM pme_tasks");
        info.taskCount = (count[0] as Record<string, unknown>).count;
      } catch (e: unknown) {
        info.taskCountError = e instanceof Error ? e.message : String(e);
      }
    } catch (e: unknown) {
      info.dbConnection = "FAILED";
      info.dbError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(info);
}
