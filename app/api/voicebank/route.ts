import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { SEED_EXEMPLARS } from "@/lib/craft";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const seeds = SEED_EXEMPLARS.map((e) => ({ ...e, seeded: true }));
  if (!hasDb()) return NextResponse.json({ connected: false, exemplars: seeds, questions: [] });
  try {
    const sql = db();
    const exemplars = await sql`
      SELECT id, channel, label, note, body, added_by, added_at
      FROM exemplars WHERE active = TRUE ORDER BY added_at DESC LIMIT 60`;
    const questions = await sql`
      SELECT id, profession, stage, kind, text, context, heard_from, times_heard, added_at
      FROM questions WHERE active = TRUE
      ORDER BY times_heard DESC, added_at DESC LIMIT 200`;
    return NextResponse.json({
      connected: true,
      exemplars: [...seeds, ...exemplars],
      questions,
    });
  } catch (err) {
    return NextResponse.json(
      { connected: true, exemplars: seeds, questions: [], error: err instanceof Error ? err.message : "Could not read the voice bank." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    const b = await req.json();
    const sql = db();

    if (b.kind === "exemplar") {
      if (!b.channel || !b.label?.trim() || !b.body?.trim() || !b.addedBy?.trim()) {
        return NextResponse.json(
          { error: "An exemplar needs a channel, a label, the copy itself, and your name." },
          { status: 400 }
        );
      }
      const rows = await sql`
        INSERT INTO exemplars (channel, label, note, body, added_by)
        VALUES (${b.channel}, ${b.label}, ${b.note || null}, ${b.body}, ${b.addedBy})
        RETURNING id`;
      return NextResponse.json({ ok: true, id: Number(rows[0].id) });
    }

    if (!b.profession || !b.text?.trim()) {
      return NextResponse.json(
        { error: "A question needs a profession and the question itself." },
        { status: 400 }
      );
    }
    // The same question heard again is signal, not a duplicate.
    const dup = await sql`
      SELECT id FROM questions
      WHERE active = TRUE AND profession = ${b.profession} AND lower(text) = lower(${b.text})
      LIMIT 1`;
    if (dup.length) {
      await sql`UPDATE questions SET times_heard = times_heard + 1 WHERE id = ${dup[0].id}`;
      return NextResponse.json({ ok: true, id: Number(dup[0].id), merged: true });
    }
    const rows = await sql`
      INSERT INTO questions (profession, stage, kind, text, context, heard_from)
      VALUES (${b.profession}, ${b.stage || null}, ${b.qkind || "question"},
              ${b.text}, ${b.context || null}, ${b.heardFrom || null})
      RETURNING id`;
    return NextResponse.json({ ok: true, id: Number(rows[0].id) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save it." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, kind } = await req.json();
    const sql = db();
    if (kind === "exemplar") await sql`UPDATE exemplars SET active = FALSE WHERE id = ${id}`;
    else await sql`UPDATE questions SET active = FALSE WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not remove it." },
      { status: 500 }
    );
  }
}
