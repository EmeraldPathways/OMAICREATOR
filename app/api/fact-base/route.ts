import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ connected: false, facts: [] });
  try {
    const facts = await db()`SELECT id, fact_key, label, value, status, note, updated_at FROM brand_facts ORDER BY id`;
    return NextResponse.json({ connected: true, facts });
  } catch (error) {
    return NextResponse.json({ connected: true, facts: [], error: error instanceof Error ? error.message : "Could not load the fact base." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
  try {
    const body = await req.json();
    if (!body.factKey?.trim() || !body.label?.trim() || !body.value?.trim()) return NextResponse.json({ error: "A fact needs a key, label and value." }, { status: 400 });
    const sql = db();
    await sql`INSERT INTO brand_facts (fact_key, label, value, status, note) VALUES (${body.factKey.trim()}, ${body.label.trim()}, ${body.value.trim()}, ${body.status || "verified"}, ${body.note?.trim() || null})`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the fact." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
  try {
    const body = await req.json();
    if (!body.id || !body.label?.trim() || !body.value?.trim()) return NextResponse.json({ error: "A fact needs a label and value." }, { status: 400 });
    const sql = db();
    await sql`UPDATE brand_facts SET label = ${body.label.trim()}, value = ${body.value.trim()}, status = ${body.status || "verified"}, note = ${body.note?.trim() || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${Number(body.id)}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the fact." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
  try {
    const { id } = await req.json();
    await db()`DELETE FROM brand_facts WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove the fact." }, { status: 500 });
  }
}
