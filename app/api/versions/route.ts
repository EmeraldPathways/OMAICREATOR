import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { authorizeBrandAccess } from "@/lib/brandAccess";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Full immutable history for one piece — the archive, not the approval log. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const access = await authorizeBrandAccess(new URL(req.url).searchParams.get("brandId") ?? undefined);
  if (!access.ok) return access.response;
  if (!hasDb() || !id) return NextResponse.json({ versions: [] });
  try {
    const sql = db();
    const piece = await sql`SELECT * FROM pieces WHERE id = ${id} AND brand_id = ${access.brandId}`;
    const versions = await sql`
      SELECT id, version_no, body, action, actor, actor_role, risk_score, audit, sources, created_at
      FROM versions WHERE piece_id = ${id} AND EXISTS (SELECT 1 FROM pieces p WHERE p.id = ${id} AND p.brand_id = ${access.brandId}) ORDER BY version_no ASC`;
    return NextResponse.json({ piece: piece[0] || null, versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the history.";
    return NextResponse.json({ versions: [], error: message }, { status: 500 });
  }
}
