import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Full immutable history for one piece — the archive, not the approval log. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!hasDb() || !id) return NextResponse.json({ versions: [] });
  try {
    const sql = db();
    const piece = await sql`SELECT * FROM pieces WHERE id = ${id}`;
    const versions = await sql`
      SELECT id, version_no, body, action, actor, actor_role, risk_score, audit, sources, created_at
      FROM versions WHERE piece_id = ${id} ORDER BY version_no ASC`;
    return NextResponse.json({ piece: piece[0] || null, versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the history.";
    return NextResponse.json({ versions: [], error: message }, { status: 500 });
  }
}
