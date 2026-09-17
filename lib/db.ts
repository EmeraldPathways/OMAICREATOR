import { env } from "cloudflare:workers";
import { SCHEMA_SQL } from "@/lib/schemaSql";

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

function sqliteQuery(query: string) {
  return query
    .replace(/::(?:jsonb|vector|int|numeric|text|bigint)/gi, "")
    .replace(/\bnow\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/CREATE EXTENSION IF NOT EXISTS vector/gi, "SELECT 1")
    .replace(/\s+NULLS LAST/gi, "")
    .replace(/\bTIMESTAMPTZ\b/gi, "TEXT")
    .replace(/\bBIGSERIAL\b/gi, "INTEGER")
    .replace(/\bBIGINT\b/gi, "INTEGER")
    .replace(/\bJSONB\b/gi, "TEXT")
    .replace(/DEFAULT\s+'CURRENT_TIMESTAMP'/gi, "DEFAULT CURRENT_TIMESTAMP")
    .replace(/\bBOOLEAN\b/gi, "INTEGER");
}

export function db(): SqlTag {
  const database = env.DB;
  if (!database) throw new Error("The hosted database is unavailable. Check the DB binding and redeploy.");
  return async (strings, ...values) => {
    let query = strings[0] || "";
    for (let i = 0; i < values.length; i += 1) query += `?${strings[i + 1] || ""}`;
    const result = await database.prepare(sqliteQuery(query)).bind(...values).all<Record<string, unknown>>();
    return result.results || [];
  };
}

export function hasDb() { return Boolean(env.DB); }
export async function vectorReady(): Promise<boolean> { return false; }
export async function initSchema(): Promise<{ vector: boolean; notes: string[] }> {
  if (!env.DB) throw new Error("The hosted database is unavailable. Check the DB binding and redeploy.");
  await env.DB.batch(SCHEMA_SQL.map((statement) => {
    const safeStatement = statement.replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ");
    return env.DB.prepare(sqliteQuery(safeStatement));
  }));
  return { vector: false, notes: ["Hosted persistence uses Cloudflare D1. The tables are now ready."] };
}

export interface StoredPiece { id: number; channel: string; format: string; profession: string; topic: string; final_text: string; was_edited: boolean; approved_by: string; approved_at: string; }
export interface StoredFact { id: number; claim: string; value: string; source_url: string; source_title: string | null; verified_at: string; expires_at: string; expired?: boolean; }
export interface Lesson { id: number; scope: string; category: string; lesson: string; times_seen: number; }
