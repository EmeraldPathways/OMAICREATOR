import { NextResponse } from "next/server";
import { db, hasDb, vectorReady } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  if (!hasDb()) {
    return NextResponse.json({ connected: false });
  }
  try {
    const sql = db();

    const pieces = await sql`
      SELECT id, channel, format, profession, topic, was_edited, verdict,
             approved_by, approved_at, left(final_text, 300) AS excerpt
      FROM pieces WHERE retired_at IS NULL
      ORDER BY approved_at DESC LIMIT 40`;

    const facts = await sql`
      SELECT id, claim, value, source_url, source_title, verified_by,
             verified_at, expires_at, expires_at <= now() AS expired
      FROM verified_facts WHERE superseded = FALSE
      ORDER BY expires_at ASC LIMIT 60`;

    const lessons = await sql`
      SELECT id, scope, category, lesson, evidence, times_seen, created_at
      FROM lessons WHERE active = TRUE
      ORDER BY times_seen DESC, created_at DESC LIMIT 40`;

    const findings = await sql`
      SELECT rule, kind, count(*)::int AS hits
      FROM findings
      GROUP BY rule, kind ORDER BY hits DESC LIMIT 15`;

    return NextResponse.json({
      connected: true,
      vector: await vectorReady(),
      pieces,
      facts,
      lessons,
      findings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the library.";
    return NextResponse.json({ connected: true, error: message }, { status: 500 });
  }
}

/** Retire a piece so it stops being used as an exemplar. */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const sql = db();
    await sql`UPDATE pieces SET retired_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not retire the piece.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
