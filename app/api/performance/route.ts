import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Results, fed back in — narrowly.
 *
 * A performance signal in regulated content is dangerous if you let it run
 * loose: optimising for engagement is exactly how a firm drifts into fear-led
 * copy, and fear-led copy aimed at people worrying about illness is both a
 * brand failure and a vulnerability problem under the 2026 Code.
 *
 * So this data is allowed to influence structure, hooks and subject lines only.
 * It is never allowed to influence what is claimed, how strongly, or what
 * caveats appear. That separation is enforced in lib/learn.ts, where only
 * lessons in the structure/cta/length/framing categories can be derived from it.
 */

const MIN_SAMPLE = 30;

export async function GET() {
  if (!hasDb()) return NextResponse.json({ connected: false, rows: [], ready: false });
  try {
    const sql = db();
    const rows = await sql`
      SELECT pf.id, pf.channel, pf.metric, pf.value, pf.sample_size, pf.measured_at,
             p.topic, p.profession, p.format
      FROM performance pf
      LEFT JOIN pieces p ON p.id = pf.piece_id
      ORDER BY pf.measured_at DESC LIMIT 100`;

    const usable = await sql`
      SELECT channel, metric, count(*)::int AS n, round(avg(value)::numeric, 2) AS avg_value
      FROM performance
      WHERE sample_size IS NULL OR sample_size >= ${MIN_SAMPLE}
      GROUP BY channel, metric
      HAVING count(*) >= 5
      ORDER BY n DESC`;

    return NextResponse.json({
      connected: true,
      rows,
      benchmarks: usable,
      ready: usable.length > 0,
      minSample: MIN_SAMPLE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read performance.";
    return NextResponse.json({ connected: true, rows: [], ready: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    const b = await req.json();
    const entries = Array.isArray(b.entries) ? b.entries : [b];
    const sql = db();
    let saved = 0;
    for (const e of entries) {
      if (!e.channel || !e.metric || e.value === undefined || e.value === null) continue;
      await sql`
        INSERT INTO performance (piece_id, channel, metric, value, sample_size, external_id)
        VALUES (${e.pieceId || null}, ${e.channel}, ${e.metric}, ${Number(e.value)},
                ${e.sampleSize ? Number(e.sampleSize) : null}, ${e.externalId || null})`;
      saved++;
    }
    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save performance data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
