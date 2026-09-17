import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

/** The review queue, ordered by risk then by deadline. */
export async function GET() {
  if (!hasDb()) return NextResponse.json({ connected: false, items: [] });
  try {
    const sql = db();
    const items = await sql`
      SELECT p.id, p.channel, p.format, p.profession, p.topic, p.status,
             p.risk_score, p.due_on, p.approved_by, p.approver_role, p.approved_at,
             p.campaign_id, c.name AS campaign_name,
             left(p.final_text, 220) AS excerpt,
             (SELECT count(*)::int FROM versions v WHERE v.piece_id = p.id) AS version_count
      FROM pieces p
      LEFT JOIN campaigns c ON c.id = p.campaign_id
      WHERE p.retired_at IS NULL AND p.status <> 'approved'
      ORDER BY p.risk_score DESC NULLS LAST, p.due_on ASC NULLS LAST, p.approved_at DESC
      LIMIT 50`;
    return NextResponse.json({ connected: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the queue.";
    return NextResponse.json({ connected: true, items: [], error: message }, { status: 500 });
  }
}

/** Move a piece through the workflow, writing an immutable version row. */
export async function POST(req: Request) {
  try {
    const { id, status, actor, role, note } = await req.json();
    if (!id || !status || !actor?.trim() || !role) {
      return NextResponse.json(
        { error: "Changing status needs the piece, the new status, and who is doing it in what role." },
        { status: 400 }
      );
    }
    if (role !== "compliance" && (status === "approved" || status === "blocked")) {
      return NextResponse.json(
        { error: "Only the compliance role can approve or block a piece." },
        { status: 403 }
      );
    }

    const sql = db();
    const cur = await sql`SELECT final_text, risk_score FROM pieces WHERE id = ${id}`;
    if (!cur.length) return NextResponse.json({ error: "No such piece." }, { status: 404 });

    const n = await sql`SELECT coalesce(max(version_no), 0) + 1 AS next FROM versions WHERE piece_id = ${id}`;

    await sql`
      INSERT INTO versions (piece_id, version_no, body, action, actor, actor_role, risk_score, audit)
      VALUES (${id}, ${Number(n[0].next)}, ${cur[0].final_text}, ${status},
              ${actor}, ${role}, ${cur[0].risk_score},
              ${JSON.stringify({ note: note || null })}::jsonb)`;

    await sql`UPDATE pieces SET status = ${status} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update the piece.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
