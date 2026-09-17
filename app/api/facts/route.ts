import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { embed } from "@/lib/learn";
import { resolveOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Save a figure that has been checked against a source, with a hard expiry. */
export async function POST(req: Request) {
  try {
    if (!hasDb()) {
      return NextResponse.json({ error: "No database connected." }, { status: 400 });
    }
    const body = await req.json();
    const { claim, value, sourceUrl, sourceTitle, verifiedBy, monthsValid } = body;

    if (!claim?.trim() || !value?.trim() || !sourceUrl?.trim() || !verifiedBy?.trim()) {
      return NextResponse.json(
        { error: "A verified figure needs the claim, the value, a source URL, and who checked it." },
        { status: 400 }
      );
    }

    const months = Math.min(Math.max(Number(monthsValid) || 6, 1), 24);
    // Compute the expiry in JS rather than casting a parameter to an interval
    // in SQL, which Postgres cannot type-infer from a bare number.
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const sql = db();

    // A new value for the same claim supersedes the old one rather than sitting beside it.
    await sql`UPDATE verified_facts SET superseded = TRUE WHERE lower(claim) = lower(${claim}) AND superseded = FALSE`;

    const rows = await sql`
      INSERT INTO verified_facts (claim, value, source_url, source_title, verified_by, expires_at)
      VALUES (${claim}, ${value}, ${sourceUrl}, ${sourceTitle || null}, ${verifiedBy},
              ${expiresAt.toISOString()})
      RETURNING id`;

    const id = Number(rows[0].id);
    try {
      const key = resolveOpenAIKey(body.runtimeKey);
      const vec = await embed(`${claim} ${value}`, key);
      if (vec) {
        await sql`UPDATE verified_facts SET embedding = ${`[${vec.join(",")}]`}::vector WHERE id = ${id}`;
      }
    } catch {
      // Embedding is optional; the row is saved either way.
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the figure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Mark a figure as superseded — used when re-verifying an expired one. */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const sql = db();
    await sql`UPDATE verified_facts SET superseded = TRUE WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not retire the figure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
