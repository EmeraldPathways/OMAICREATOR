import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { authorizeBrandAccess } from "@/lib/brandAccess";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await authorizeBrandAccess(new URL(request.url).searchParams.get("brandId") ?? undefined);
  if (!access.ok) return access.response;
  if (!hasDb()) return NextResponse.json({ connected: false, entries: [] });
  try {
    const entries = await db()`SELECT * FROM activity_log WHERE brand_id = ${access.brandId} ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json({ connected: true, entries });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not load activity." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    if (!body.action?.trim() || !body.entityType?.trim()) return NextResponse.json({ error: "An activity needs an action and entity type." }, { status: 400 });
    await db()`INSERT INTO activity_log (brand_id, action, entity_type, entity_id, actor, detail) VALUES (${access.brandId}, ${body.action.trim()}, ${body.entityType.trim()}, ${body.entityId || null}, ${access.actor || body.actor?.trim() || null}, ${body.detail || null})`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not save activity." }, { status: 500 });
  }
}
