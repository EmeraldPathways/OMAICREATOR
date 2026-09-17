import { db, hasDb } from "./db";
import { craftBlock, type CraftBrief } from "./prompts";

/**
 * Gathers the craft inputs — approved exemplars, the advisor question bank, and
 * an interview transcript if one is attached — and renders them into the block
 * every generator shares. Degrades to the seeded exemplars when there is no
 * database, so nothing here is load-bearing.
 */
export async function gatherCraft(
  brief: CraftBrief,
  interviewId?: number | null
): Promise<string> {
  if (!hasDb()) return craftBlock(brief);

  try {
    const sql = db();

    const exemplars = (await sql`
      SELECT label, note, body FROM exemplars
      WHERE active = TRUE AND channel = ${brief.channel}
      ORDER BY added_at DESC LIMIT 2`) as unknown as {
      label: string;
      note: string | null;
      body: string;
    }[];

    const questions = (await sql`
      SELECT id, text, context, kind FROM questions
      WHERE active = TRUE AND profession = ${brief.profession}
        AND (stage IS NULL OR stage = ${brief.stage || null})
      ORDER BY times_heard DESC, added_at DESC LIMIT 8`) as unknown as {
      id: number;
      text: string;
      context: string | null;
      kind: string;
    }[];

    let interview: { q: string; a: string }[] = [];
    if (interviewId) {
      const rows = await sql`SELECT transcript FROM interviews WHERE id = ${interviewId}`;
      if (rows.length) {
        const t = rows[0].transcript;
        const parsed = typeof t === "string" ? JSON.parse(t) : t;
        interview = (parsed || []).filter(
          (x: { a?: string }) => x.a && String(x.a).trim()
        );
      }
    }

    return craftBlock(brief, { exemplars, questions, interview });
  } catch {
    return craftBlock(brief);
  }
}
