import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let rankscopeSchemaReady: Promise<void> | null = null;

async function ensureRankScopeTables(database: NonNullable<typeof env.DB>) {
  if (!rankscopeSchemaReady) {
    rankscopeSchemaReady = database.batch([
      database.prepare("CREATE TABLE IF NOT EXISTS workspace_snapshots (workspace_key TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      database.prepare("CREATE TABLE IF NOT EXISTS assistant_threads (workspace_key TEXT PRIMARY KEY NOT NULL, messages TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      database.prepare("CREATE TABLE IF NOT EXISTS google_connections (workspace_key TEXT PRIMARY KEY NOT NULL, refresh_token_ciphertext TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    ]).then(() => undefined).catch((error: unknown) => {
      rankscopeSchemaReady = null;
      throw error;
    });
  }
  await rankscopeSchemaReady;
}

export async function getDb() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  await ensureRankScopeTables(env.DB);
  return drizzle(env.DB, { schema });
}
