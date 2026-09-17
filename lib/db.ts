import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres, provisioned through the Vercel Marketplace.
 * The integration injects DATABASE_URL into the project automatically.
 */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No DATABASE_URL. Add the Neon integration in Vercel > Storage, then redeploy."
    );
  }
  return neon(url);
}

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

/** Does this database have pgvector? Similarity retrieval needs it. */
export async function vectorReady(): Promise<boolean> {
  try {
    const sql = db();
    const rows = await sql`SELECT 1 FROM pg_extension WHERE extname = 'vector'`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Creates the schema. Safe to run repeatedly — everything is IF NOT EXISTS.
 * Call it once from /api/db/init after the database is connected.
 */
export async function initSchema(): Promise<{ vector: boolean; notes: string[] }> {
  const sql = db();
  const notes: string[] = [];
  let vector = false;

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    vector = true;
  } catch {
    notes.push(
      "pgvector is not available on this database. Retrieval will fall back to " +
        "the most recent matching pieces instead of the most similar ones."
    );
  }

  // Every piece that has been through the tool, approved or not.
  await sql`
    CREATE TABLE IF NOT EXISTS pieces (
      id            BIGSERIAL PRIMARY KEY,
      channel       TEXT NOT NULL,
      format        TEXT NOT NULL,
      profession    TEXT NOT NULL,
      topic         TEXT NOT NULL,
      tone          TEXT,
      direction     TEXT,
      ai_draft      TEXT NOT NULL,
      final_text    TEXT NOT NULL,
      was_edited    BOOLEAN NOT NULL DEFAULT FALSE,
      verdict       TEXT,
      sources       JSONB NOT NULL DEFAULT '[]'::jsonb,
      approved_by   TEXT NOT NULL,
      approved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      retired_at    TIMESTAMPTZ
    )`;

  // What the human changed between the AI draft and the approved version,
  // turned into a reusable instruction. This is the highest-signal table.
  await sql`
    CREATE TABLE IF NOT EXISTS lessons (
      id          BIGSERIAL PRIMARY KEY,
      piece_id    BIGINT REFERENCES pieces(id) ON DELETE CASCADE,
      scope       TEXT NOT NULL DEFAULT 'all',
      category    TEXT NOT NULL,
      lesson      TEXT NOT NULL,
      evidence    TEXT,
      times_seen  INT NOT NULL DEFAULT 1,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  // External figures that were checked against a source, WITH AN EXPIRY.
  // Nothing here is usable past expires_at. That is deliberate.
  await sql`
    CREATE TABLE IF NOT EXISTS verified_facts (
      id           BIGSERIAL PRIMARY KEY,
      claim        TEXT NOT NULL,
      value        TEXT NOT NULL,
      source_url   TEXT NOT NULL,
      source_title TEXT,
      verified_by  TEXT NOT NULL,
      verified_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at   TIMESTAMPTZ NOT NULL,
      superseded   BOOLEAN NOT NULL DEFAULT FALSE
    )`;

  // Every compliance and voice finding, so recurring failures become rules.
  await sql`
    CREATE TABLE IF NOT EXISTS findings (
      id          BIGSERIAL PRIMARY KEY,
      piece_id    BIGINT,
      channel     TEXT,
      profession  TEXT,
      kind        TEXT NOT NULL,
      rule        TEXT NOT NULL,
      detail      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;


  // A campaign holds one brief and the set of pieces derived from it, so the
  // two-layer funnel (soft top-of-funnel video, hard-CTA calendar) stays intact
  // rather than collapsing into one undifferentiated stream.
  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id          BIGSERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      profession  TEXT NOT NULL,
      objective   TEXT,
      theme       TEXT,
      layer       TEXT NOT NULL DEFAULT 'hard',
      starts_on   DATE,
      ends_on     DATE,
      brief       TEXT,
      created_by  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at   TIMESTAMPTZ
    )`;

  // Immutable version history. Approval logs are not archives: this keeps the
  // text, who changed it, what the audit said at that moment, and the sources
  // cited at that moment. Rows are never updated, only inserted.
  await sql`
    CREATE TABLE IF NOT EXISTS versions (
      id          BIGSERIAL PRIMARY KEY,
      piece_id    BIGINT NOT NULL,
      version_no  INT NOT NULL,
      body        TEXT NOT NULL,
      action      TEXT NOT NULL,
      actor       TEXT NOT NULL,
      actor_role  TEXT NOT NULL,
      risk_score  INT,
      audit       JSONB,
      sources     JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  // What Omega knows about its clients' working lives, as distinct from what it
  // knows about itself. This is the differentiator over generalist advisors.
  await sql`
    CREATE TABLE IF NOT EXISTS knowledge (
      id          BIGSERIAL PRIMARY KEY,
      profession  TEXT NOT NULL,
      topic       TEXT NOT NULL,
      body        TEXT NOT NULL,
      source_url  TEXT,
      added_by    TEXT NOT NULL,
      added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at  TIMESTAMPTZ,
      active      BOOLEAN NOT NULL DEFAULT TRUE
    )`;

  // Results, fed back in. Deliberately narrow: see lib/learn.ts for why this
  // can influence structure and subject lines but never claims or caveats.
  await sql`
    CREATE TABLE IF NOT EXISTS performance (
      id          BIGSERIAL PRIMARY KEY,
      piece_id    BIGINT,
      channel     TEXT NOT NULL,
      metric      TEXT NOT NULL,
      value       NUMERIC NOT NULL,
      sample_size INT,
      measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      external_id TEXT
    )`;

  // What the estate sweep found in live collateral.
  await sql`
    CREATE TABLE IF NOT EXISTS estate_findings (
      id          BIGSERIAL PRIMARY KEY,
      url         TEXT NOT NULL,
      page_title  TEXT,
      fact_id     TEXT NOT NULL,
      kind        TEXT NOT NULL,
      excerpt     TEXT,
      found_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    )`;

  // Real approved Omega copy, added over time, used as style exemplars.
  await sql`
    CREATE TABLE IF NOT EXISTS exemplars (
      id         BIGSERIAL PRIMARY KEY,
      channel    TEXT NOT NULL,
      label      TEXT NOT NULL,
      note       TEXT,
      body       TEXT NOT NULL,
      added_by   TEXT NOT NULL,
      added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      active     BOOLEAN NOT NULL DEFAULT TRUE
    )`;

  // What advisors actually get asked. The best content answers a real question
  // rather than a topic someone picked in a planning meeting.
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id          BIGSERIAL PRIMARY KEY,
      profession  TEXT NOT NULL,
      stage       TEXT,
      kind        TEXT NOT NULL DEFAULT 'question',
      text        TEXT NOT NULL,
      context     TEXT,
      heard_from  TEXT,
      times_heard INT NOT NULL DEFAULT 1,
      used_count  INT NOT NULL DEFAULT 0,
      added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      active      BOOLEAN NOT NULL DEFAULT TRUE
    )`;

  // Advisor interviews — the raw material that makes copy specific.
  await sql`
    CREATE TABLE IF NOT EXISTS interviews (
      id          BIGSERIAL PRIMARY KEY,
      advisor     TEXT NOT NULL,
      profession  TEXT NOT NULL,
      stage       TEXT,
      topic       TEXT NOT NULL,
      transcript  JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at   TIMESTAMPTZ
    )`;

  // Columns added to pieces over time.
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS campaign_id BIGINT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS risk_score INT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS approver_role TEXT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS derived_from BIGINT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS due_on DATE`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS external_ref TEXT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS career_stage TEXT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS framework TEXT`;
  await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS interview_id BIGINT`;

  if (vector) {
    await sql`ALTER TABLE pieces ADD COLUMN IF NOT EXISTS embedding vector(1536)`;
    await sql`ALTER TABLE verified_facts ADD COLUMN IF NOT EXISTS embedding vector(1536)`;
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS pieces_embedding_idx
        ON pieces USING hnsw (embedding vector_cosine_ops)`;
      await sql`
        CREATE INDEX IF NOT EXISTS facts_embedding_idx
        ON verified_facts USING hnsw (embedding vector_cosine_ops)`;
    } catch {
      notes.push("HNSW index unavailable; similarity search will still work, just slower.");
    }
  }

  await sql`CREATE INDEX IF NOT EXISTS pieces_lookup_idx ON pieces (channel, profession, approved_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS facts_expiry_idx ON verified_facts (expires_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS lessons_active_idx ON lessons (active, times_seen DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS versions_piece_idx ON versions (piece_id, version_no DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS pieces_status_idx ON pieces (status, risk_score DESC NULLS LAST, due_on)`;
  await sql`CREATE INDEX IF NOT EXISTS knowledge_lookup_idx ON knowledge (profession, active)`;
  await sql`CREATE INDEX IF NOT EXISTS estate_open_idx ON estate_findings (resolved_at, found_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS performance_piece_idx ON performance (piece_id, metric)`;
  await sql`CREATE INDEX IF NOT EXISTS exemplars_channel_idx ON exemplars (channel, active)`;
  await sql`CREATE INDEX IF NOT EXISTS questions_lookup_idx ON questions (profession, active, times_heard DESC)`;

  return { vector, notes };
}

export interface StoredPiece {
  id: number;
  channel: string;
  format: string;
  profession: string;
  topic: string;
  final_text: string;
  was_edited: boolean;
  approved_by: string;
  approved_at: string;
}

export interface StoredFact {
  id: number;
  claim: string;
  value: string;
  source_url: string;
  source_title: string | null;
  verified_at: string;
  expires_at: string;
  expired?: boolean;
}

export const ROLES = [
  { id: "marketer", name: "Marketing", can: "draft and submit for review" },
  { id: "compliance", name: "Compliance", can: "review, approve or block" },
  { id: "advisor", name: "Advisor", can: "sign off on technical accuracy" },
] as const;

export type Role = (typeof ROLES)[number]["id"];

export interface Lesson {
  id: number;
  scope: string;
  category: string;
  lesson: string;
  times_seen: number;
}
