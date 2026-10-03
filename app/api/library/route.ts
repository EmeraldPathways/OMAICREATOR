import { NextResponse } from "next/server";
import { db, hasDb, vectorReady } from "@/lib/db";
import { authorizeBrandAccess } from "@/lib/brandAccess";

export const runtime = "nodejs";
export const maxDuration = 30;

// D1 uses SQLite functions; keep library excerpts portable across hosted environments.

export async function GET(request: Request) {
  const access = await authorizeBrandAccess(new URL(request.url).searchParams.get("brandId") ?? undefined);
  if (!access.ok) return access.response;
  if (!hasDb()) {
    return NextResponse.json({ connected: false });
  }
  try {
    const sql = db();

    const pieces = await sql`
      SELECT id, channel, format, profession, topic, was_edited, verdict,
             approved_by, approved_at, substr(final_text, 1, 300) AS excerpt
      FROM pieces WHERE brand_id = ${access.brandId} AND retired_at IS NULL
      ORDER BY approved_at DESC LIMIT 40`;

    const facts = await sql`
      SELECT id, claim, value, source_url, source_title, verified_by,
             verified_at, expires_at, expires_at <= now() AS expired
      FROM verified_facts WHERE brand_id = ${access.brandId} AND superseded = FALSE
      ORDER BY expires_at ASC LIMIT 60`;

    const lessons = await sql`
      SELECT l.id, l.scope, l.category, l.lesson, l.evidence, l.times_seen, l.created_at
      FROM lessons l LEFT JOIN pieces p ON p.id = l.piece_id
      WHERE l.active = TRUE AND (p.brand_id = ${access.brandId} OR (${access.brandId} = 'omega-financial' AND l.piece_id IS NULL))
      ORDER BY l.times_seen DESC, l.created_at DESC LIMIT 40`;

    const findings = await sql`
      SELECT rule, kind, count(*)::int AS hits
      FROM findings
      WHERE brand_id = ${access.brandId}
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
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    const { id } = body;
    const sql = db();
    await sql`UPDATE pieces SET retired_at = now() WHERE id = ${id} AND brand_id = ${access.brandId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not retire the piece.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
