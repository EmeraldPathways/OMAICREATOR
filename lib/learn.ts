import { db, vectorReady, type StoredPiece, type StoredFact, type Lesson } from "./db";
import { chatJSON } from "./openai";

/* ----------------------------------------------------------- embeddings -- */

export async function embed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/* ------------------------------------------------------------ retrieval -- */

export interface KnowledgeEntry {
  id: number;
  topic: string;
  body: string;
  source_url: string | null;
}

export interface LearnedContext {
  exemplars: StoredPiece[];
  facts: StoredFact[];
  lessons: Lesson[];
  expiredFacts: StoredFact[];
  knowledge: KnowledgeEntry[];
  mode: "similarity" | "recency" | "off";
}

const EMPTY: LearnedContext = {
  exemplars: [],
  facts: [],
  lessons: [],
  expiredFacts: [],
  knowledge: [],
  mode: "off",
};

/**
 * Categories a lesson may fall into if it was derived from PERFORMANCE data
 * rather than from a human edit. Deliberately excludes anything that could
 * change what is claimed or how it is caveated — see app/api/performance.
 */
export const PERFORMANCE_SAFE_CATEGORIES = ["structure", "length", "cta", "framing"];

export async function retrieve(
  brief: { channel: string; profession: string; topic: string },
  apiKey: string
): Promise<LearnedContext> {
  if (!process.env.DATABASE_URL) return EMPTY;

  try {
    const sql = db();
    const useVector = await vectorReady();
    const query = `${brief.channel} ${brief.profession} ${brief.topic}`;
    const vec = useVector ? await embed(query, apiKey) : null;

    let exemplars: StoredPiece[];
    if (vec) {
      const lit = toVectorLiteral(vec);
      exemplars = (await sql`
        SELECT id, channel, format, profession, topic, final_text, was_edited,
               approved_by, approved_at
        FROM pieces
        WHERE retired_at IS NULL
          AND channel = ${brief.channel}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${lit}::vector
        LIMIT 3`) as unknown as StoredPiece[];
    } else {
      exemplars = (await sql`
        SELECT id, channel, format, profession, topic, final_text, was_edited,
               approved_by, approved_at
        FROM pieces
        WHERE retired_at IS NULL
          AND channel = ${brief.channel}
          AND profession = ${brief.profession}
        ORDER BY approved_at DESC
        LIMIT 3`) as unknown as StoredPiece[];
    }

    // Live facts only. Expired ones are surfaced separately as a warning,
    // never handed to the model.
    let facts: StoredFact[];
    if (vec) {
      const lit = toVectorLiteral(vec);
      facts = (await sql`
        SELECT id, claim, value, source_url, source_title, verified_at, expires_at
        FROM verified_facts
        WHERE superseded = FALSE
          AND expires_at > now()
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${lit}::vector
        LIMIT 6`) as unknown as StoredFact[];
    } else {
      facts = (await sql`
        SELECT id, claim, value, source_url, source_title, verified_at, expires_at
        FROM verified_facts
        WHERE superseded = FALSE AND expires_at > now()
        ORDER BY verified_at DESC
        LIMIT 6`) as unknown as StoredFact[];
    }

    const expiredFacts = (await sql`
      SELECT id, claim, value, source_url, source_title, verified_at, expires_at
      FROM verified_facts
      WHERE superseded = FALSE AND expires_at <= now()
      ORDER BY expires_at DESC
      LIMIT 10`) as unknown as StoredFact[];

    const lessons = (await sql`
      SELECT id, scope, category, lesson, times_seen
      FROM lessons
      WHERE active = TRUE
        AND (scope = 'all' OR scope = ${brief.channel} OR scope = ${brief.profession})
      ORDER BY times_seen DESC, created_at DESC
      LIMIT 12`) as unknown as Lesson[];

    const knowledge = (await sql`
      SELECT id, topic, body, source_url
      FROM knowledge
      WHERE active = TRUE
        AND profession = ${brief.profession}
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY added_at DESC
      LIMIT 10`) as unknown as KnowledgeEntry[];

    return {
      exemplars,
      facts,
      lessons,
      expiredFacts,
      knowledge,
      mode: vec ? "similarity" : "recency",
    };
  } catch {
    // The database is an enhancement. If it is down, drafting still works.
    return EMPTY;
  }
}

/** Renders retrieved context into the draft prompt. */
export function learnedBlock(ctx: LearnedContext): string {
  if (ctx.mode === "off") return "";
  const parts: string[] = [];

  if (ctx.lessons.length) {
    parts.push(`CORRECTIONS LEARNED FROM PREVIOUS APPROVED WORK
These come from what a human actually changed before approving earlier drafts.
They override your own instincts about style and framing, but they NEVER override
the fact base or the compliance rules:
${ctx.lessons.map((l) => `- [${l.category}${l.times_seen > 1 ? `, seen ${l.times_seen}x` : ""}] ${l.lesson}`).join("\n")}`);
  }

  if (ctx.facts.length) {
    parts.push(`PREVIOUSLY VERIFIED FIGURES — still within their verification window.
You may state these, citing them as [V<id>]. If the brief needs one that is not
here and not in today's sources, do not guess it:
${ctx.facts
  .map(
    (f) =>
      `- [V${f.id}] ${f.claim}: ${f.value}\n     Source: ${f.source_url}\n     Verified ${new Date(f.verified_at).toISOString().slice(0, 10)}, expires ${new Date(f.expires_at).toISOString().slice(0, 10)}`
  )
  .join("\n")}`);
  }

  if (ctx.exemplars.length) {
    parts.push(`APPROVED WORK FOR REFERENCE
These pieces passed human sign-off. Match their register, structure and rhythm.
Do NOT lift their facts, figures or claims — those were verified for their own
moment and may since have changed:
${ctx.exemplars
  .map(
    (p, i) =>
      `--- Example ${i + 1}: ${p.format}, ${p.profession}, "${p.topic}" ---\n${p.final_text.slice(0, 1600)}`
  )
  .join("\n\n")}`);
  }

  return parts.join("\n\n");
}

/* ------------------------------------------------------ lesson learning -- */

interface ExtractedLessons {
  lessons: { category: string; scope: string; lesson: string; evidence: string }[];
}

/**
 * Compares the AI draft to what the human actually approved and turns the
 * difference into reusable instructions. Only runs when the text was edited —
 * an unedited approval teaches nothing except that the draft was fine.
 */
export async function extractLessons(
  aiDraft: string,
  finalText: string,
  brief: { channel: string; profession: string; topic: string },
  apiKey: string,
  model?: string
): Promise<ExtractedLessons["lessons"]> {
  const system = `You compare an AI-written draft against the version a human
marketer actually approved, and extract what the human's edits teach.

Write instructions that would have produced the approved version first time.
Be concrete and specific. "Be more concise" is useless. "Cut the opening
paragraph — start at the risk, not at the profession's importance" is useful.

Ignore one-off changes specific to this topic. Only extract a lesson if the same
edit would plausibly apply to a future piece. If the edits were purely cosmetic
or topic-specific, return an empty array. An empty array is a perfectly good
answer and is better than inventing a pattern from one example.

Never extract a lesson that would weaken factual care or compliance — nothing
that tells a future writer to drop a disclaimer, soften a caveat, state a figure
more confidently, or skip a citation. If the human's edit did that, leave it out.

scope is one of: "all", the channel name, or the profession name.
category is one of: "structure", "voice", "terminology", "length", "cta", "framing".

Return JSON only: { "lessons": [ { "category": "", "scope": "", "lesson": "", "evidence": "" } ] }
Maximum four lessons. "evidence" quotes the specific change, briefly.`;

  const user = `Channel: ${brief.channel} | Audience: ${brief.profession} | Topic: ${brief.topic}

--- AI DRAFT ---
${aiDraft.slice(0, 6000)}

--- HUMAN-APPROVED VERSION ---
${finalText.slice(0, 6000)}`;

  try {
    const out = await chatJSON<ExtractedLessons>({
      system,
      user,
      apiKey,
      model,
      temperature: 0,
    });
    return (out.lessons || []).slice(0, 4);
  } catch {
    return [];
  }
}

/** Merges a lesson, bumping times_seen when the same instruction recurs. */
export async function saveLesson(
  pieceId: number,
  l: { category: string; scope: string; lesson: string; evidence: string }
) {
  const sql = db();
  const existing = await sql`
    SELECT id FROM lessons
    WHERE active = TRUE AND scope = ${l.scope} AND lower(lesson) = lower(${l.lesson})
    LIMIT 1`;

  if (existing.length) {
    await sql`UPDATE lessons SET times_seen = times_seen + 1 WHERE id = ${existing[0].id}`;
  } else {
    await sql`
      INSERT INTO lessons (piece_id, scope, category, lesson, evidence)
      VALUES (${pieceId}, ${l.scope}, ${l.category}, ${l.lesson}, ${l.evidence})`;
  }
}
