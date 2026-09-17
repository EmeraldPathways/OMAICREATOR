import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildRepurposePrompt } from "@/lib/prompts";
import { retrieve, learnedBlock } from "@/lib/learn";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Adapts an already-approved piece into another channel. The whole value is
 * that the factual work is done: claims carry over with their citations, and
 * the model is barred from adding anything new.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const { sourceId, target } = b;

    if (!sourceId || !target?.channel || !target?.format) {
      return NextResponse.json(
        { error: "Repurposing needs an approved source piece and a target format." },
        { status: 400 }
      );
    }
    if (!hasDb()) {
      return NextResponse.json(
        { error: "Repurposing reads from the approved library, so it needs a database." },
        { status: 400 }
      );
    }

    const sql = db();
    const rows = await sql`
      SELECT id, channel, format, profession, topic, final_text, status
      FROM pieces WHERE id = ${sourceId} AND retired_at IS NULL`;
    if (!rows.length) return NextResponse.json({ error: "No such piece." }, { status: 404 });

    const src = rows[0];
    if (src.status !== "approved") {
      return NextResponse.json(
        { error: "Only an approved piece can be repurposed. Otherwise you would be spreading unchecked copy." },
        { status: 400 }
      );
    }

    const key = resolveOpenAIKey(b.runtimeKey);
    const sourceBrief = {
      channel: String(src.channel),
      profession: String(src.profession),
      topic: String(src.topic),
    };

    const learnedCtx = await retrieve(
      { channel: target.channel, profession: sourceBrief.profession, topic: sourceBrief.topic },
      key
    );

    const { system, user } = buildRepurposePrompt(
      String(src.final_text),
      sourceBrief,
      target,
      [],
      learnedBlock(learnedCtx)
    );

    const draft = await chatJSON<Record<string, unknown>>({
      system,
      user,
      apiKey: key,
      model: b.model,
      temperature: 0.3,
    });

    return NextResponse.json({ draft, source: { id: src.id, topic: src.topic } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Repurposing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
