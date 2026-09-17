import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildInterviewQuestionsPrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (!hasDb()) return NextResponse.json({ connected: false, interviews: [] });
  try {
    const sql = db();
    const interviews = await sql`
      SELECT id, advisor, profession, stage, topic, transcript, created_at
      FROM interviews ORDER BY created_at DESC LIMIT 30`;
    return NextResponse.json({ connected: true, interviews });
  } catch (err) {
    return NextResponse.json(
      { connected: true, interviews: [], error: err instanceof Error ? err.message : "Could not read interviews." },
      { status: 500 }
    );
  }
}

/** Generate the question set for an interview. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const brief: CraftBrief = b.brief;
    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "What is the interview about?" }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief);
    const { system, user } = buildInterviewQuestionsPrompt(brief, craft);
    const out = await chatJSON<{ questions: { n: number; q: string; why: string }[] }>({
      system, user, apiKey: key, model: b.model, temperature: 0.7,
    });
    return NextResponse.json({ questions: (out.questions || []).slice(0, 8) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not write the questions." },
      { status: 500 }
    );
  }
}

/** Save the transcript. */
export async function PUT(req: Request) {
  try {
    if (!hasDb()) {
      return NextResponse.json({ error: "Saving an interview needs a database." }, { status: 400 });
    }
    const b = await req.json();
    if (!b.advisor?.trim() || !b.topic?.trim()) {
      return NextResponse.json(
        { error: "An interview needs the advisor's name and the topic." },
        { status: 400 }
      );
    }
    const answered = (b.transcript || []).filter(
      (t: { a?: string }) => t.a && String(t.a).trim()
    );
    if (!answered.length) {
      return NextResponse.json(
        { error: "Nothing was answered, so there is nothing to save." },
        { status: 400 }
      );
    }

    const sql = db();
    if (b.id) {
      await sql`
        UPDATE interviews SET transcript = ${JSON.stringify(answered)}::jsonb
        WHERE id = ${b.id}`;
      return NextResponse.json({ ok: true, id: Number(b.id), answered: answered.length });
    }
    const rows = await sql`
      INSERT INTO interviews (advisor, profession, stage, topic, transcript)
      VALUES (${b.advisor}, ${b.profession}, ${b.stage || null}, ${b.topic},
              ${JSON.stringify(answered)}::jsonb)
      RETURNING id`;
    return NextResponse.json({ ok: true, id: Number(rows[0].id), answered: answered.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save the interview." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const sql = db();
    await sql`DELETE FROM interviews WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete it." },
      { status: 500 }
    );
  }
}
