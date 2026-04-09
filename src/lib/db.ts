import { neon, neonConfig } from "@neondatabase/serverless";

function getConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  try {
    const url = new URL(raw);
    // Remove channel_binding parameter
    url.searchParams.delete("channel_binding");
    // Switch from pooler to direct endpoint for HTTP queries
    // pooler: ep-xxx-pooler.c-5.xxx -> direct: ep-xxx.c-5.xxx
    url.hostname = url.hostname.replace("-pooler.", ".");
    return url.toString();
  } catch {
    return raw
      .replace(/[&?]channel_binding=[^&]*/g, "")
      .replace("-pooler.", ".");
  }
}

// Set the fetch endpoint to use the direct host (not pooler)
neonConfig.fetchEndpoint = (host: string) => {
  // Ensure we use the direct endpoint
  const directHost = host.replace("-pooler.", ".");
  return `https://${directHost}/sql`;
};

const connectionString = getConnectionString();
const sql = neon(connectionString);

export async function query(text: string, params?: unknown[]) {
  if (params && params.length > 0) {
    return (await sql.query(text, params as (string | number | boolean | null | undefined)[])) as Record<
      string,
      unknown
    >[];
  }
  return (await sql.query(text)) as Record<string, unknown>[];
}
