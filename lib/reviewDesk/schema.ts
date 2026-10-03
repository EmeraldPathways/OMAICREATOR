import { isBrandId, type BrandId } from "../brandProfiles";

export function isReviewDeskBrandId(value: unknown): value is BrandId {
  return isBrandId(value);
}

export const REVIEW_DESK_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS rd_settings (
    brand_id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rd_secrets (
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (brand_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS rd_oauth_states (
    state TEXT PRIMARY KEY NOT NULL,
    brand_id TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    verifier TEXT NOT NULL,
    expires INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rd_locations (
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    account TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    seen INTEGER NOT NULL,
    PRIMARY KEY (brand_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS rd_reviews (
    brand_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    draft TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    demo INTEGER NOT NULL DEFAULT 0,
    updated TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    created TEXT NOT NULL DEFAULT '',
    first_seen INTEGER NOT NULL,
    published_at TEXT NOT NULL DEFAULT '',
    flag TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    processing_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (brand_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS rd_reviews_due ON rd_reviews(brand_id, status, demo, first_seen)`,
  `CREATE TABLE IF NOT EXISTS rd_examples (
    brand_id TEXT NOT NULL,
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    review_id TEXT,
    original TEXT NOT NULL DEFAULT '',
    reply TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    created INTEGER NOT NULL,
    UNIQUE (brand_id, review_id)
  )`,
  `CREATE TABLE IF NOT EXISTS rd_audit (
    brand_id TEXT NOT NULL,
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    action TEXT NOT NULL,
    review TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS rd_audit_recent ON rd_audit(brand_id, ts DESC)`,
  `CREATE TABLE IF NOT EXISTS rd_daily_budget (
    brand_id TEXT NOT NULL,
    day TEXT NOT NULL,
    used INTEGER NOT NULL,
    PRIMARY KEY (brand_id, day)
  )`,
];

const readyDatabases = new WeakMap<object, Promise<void>>();

export async function ensureReviewDeskSchema(db: D1Database): Promise<void> {
  const key = db as object;
  const existing = readyDatabases.get(key);
  if (existing) return existing;

  const setup = Promise.resolve(db.batch(REVIEW_DESK_SCHEMA.map((statement) => db.prepare(statement))))
    .then(() => undefined)
    .catch((error) => {
      readyDatabases.delete(key);
      throw error;
    });
  readyDatabases.set(key, setup);
  return setup;
}

export function assertReviewDeskBrandId(value: unknown): asserts value is BrandId {
  if (!isReviewDeskBrandId(value)) throw new Error("Select a valid Content Studio business.");
}
