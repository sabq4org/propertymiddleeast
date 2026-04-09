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
    hasFetch: typeof fetch !== "undefined",
  };

  // Test 1: Can we reach Neon's HTTP endpoint at all?
  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      const host = u.hostname;
      const testUrl = `https://${host}/sql`;
      info.neonHttpEndpoint = testUrl;

      const fetchStart = Date.now();
      const resp = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "SELECT 1", params: [] }),
      });
      info.fetchDuration = Date.now() - fetchStart;
      info.fetchStatus = resp.status;
      info.fetchStatusText = resp.statusText;
      const body = await resp.text();
      info.fetchBody = body.substring(0, 500);
    } catch (e: unknown) {
      info.fetchError = e instanceof Error ? e.message : String(e);
      info.fetchErrorName = e instanceof Error ? e.constructor.name : typeof e;
      if (e instanceof Error && "cause" in e) {
        const cause = (e as { cause?: unknown }).cause;
        info.fetchErrorCause = cause instanceof Error ? cause.message : String(cause);
        if (cause instanceof Error && "code" in cause) {
          info.fetchErrorCode = (cause as { code?: string }).code;
        }
      }
    }
  }

  // Test 2: Can we reach google.com? (basic outbound test)
  try {
    const resp = await fetch("https://httpbin.org/ip", { method: "GET" });
    info.outboundTest = "SUCCESS";
    info.outboundStatus = resp.status;
    const body = await resp.text();
    info.outboundIp = body.substring(0, 200);
  } catch (e: unknown) {
    info.outboundTest = "FAILED";
    info.outboundError = e instanceof Error ? e.message : String(e);
  }

  // Test 3: Try database query
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
      info.dbErrorStack = e instanceof Error ? e.stack : undefined;
    }
  }

  return NextResponse.json(info);
}
