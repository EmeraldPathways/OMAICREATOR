import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { authorizeBrandAccess } from "@/lib/brandAccess";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await authorizeBrandAccess(new URL(request.url).searchParams.get("brandId") ?? undefined);
  if (!access.ok) return access.response;
  if (!hasDb()) return NextResponse.json({ connected: false, facts: [] });
  try {
    const facts = await db()`SELECT id, fact_key, label, value, status, note, updated_at FROM brand_facts WHERE brand_id = ${access.brandId} ORDER BY id`;
    return NextResponse.json({ connected: true, facts });
  } catch (error) {
    return NextResponse.json({ connected: true, facts: [], error: error instanceof Error ? error.message : "Could not load the fact base." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    if (!body.factKey?.trim() || !body.label?.trim() || !body.value?.trim()) return NextResponse.json({ error: "A fact needs a key, label and value." }, { status: 400 });
    const sql = db();
    await sql`INSERT INTO brand_facts (brand_id, fact_key, label, value, status, note) VALUES (${access.brandId}, ${body.factKey.trim()}, ${body.label.trim()}, ${body.value.trim()}, ${body.status || "verified"}, ${body.note?.trim() || null})`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the fact." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    if (!body.id || !body.label?.trim() || !body.value?.trim()) return NextResponse.json({ error: "A fact needs a label and value." }, { status: 400 });
    const sql = db();
    await sql`UPDATE brand_facts SET label = ${body.label.trim()}, value = ${body.value.trim()}, status = ${body.status || "verified"}, note = ${body.note?.trim() || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${Number(body.id)} AND brand_id = ${access.brandId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the fact." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    await db()`DELETE FROM brand_facts WHERE id = ${Number(body.id)} AND brand_id = ${access.brandId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove the fact." }, { status: 500 });
  }
}
