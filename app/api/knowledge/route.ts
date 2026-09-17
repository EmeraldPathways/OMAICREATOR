import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ connected: false, entries: [] });
  const profession = new URL(req.url).searchParams.get("profession");
  try {
    const sql = db();
    const entries = profession
      ? await sql`SELECT * FROM knowledge WHERE active = TRUE AND profession = ${profession} ORDER BY added_at DESC`
      : await sql`SELECT * FROM knowledge WHERE active = TRUE ORDER BY profession, added_at DESC LIMIT 200`;
    return NextResponse.json({ connected: true, entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the knowledge base.";
    return NextResponse.json({ connected: true, entries: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) return NextResponse.json({ error: "This needs a database." }, { status: 400 });
    const b = await req.json();
    if (!b.profession?.trim() || !b.topic?.trim() || !b.body?.trim() || !b.addedBy?.trim()) {
      return NextResponse.json(
        { error: "An entry needs a profession, a topic, the detail itself, and who added it." },
        { status: 400 }
      );
    }
    let expires: string | null = null;
    if (b.monthsValid) {
      const d = new Date();
      d.setMonth(d.getMonth() + Math.min(Math.max(Number(b.monthsValid), 1), 36));
      expires = d.toISOString();
    }
    const sql = db();
    const rows = await sql`
      INSERT INTO knowledge (profession, topic, body, source_url, added_by, expires_at)
      VALUES (${b.profession}, ${b.topic}, ${b.body}, ${b.sourceUrl || null}, ${b.addedBy}, ${expires})
      RETURNING id`;
    return NextResponse.json({ ok: true, id: Number(rows[0].id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the entry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const sql = db();
    await sql`UPDATE knowledge SET active = FALSE WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not remove the entry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
