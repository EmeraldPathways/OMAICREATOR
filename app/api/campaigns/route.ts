import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { CHANNELS } from "@/lib/brand";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  if (!hasDb()) return NextResponse.json({ connected: false, campaigns: [] });
  try {
    const sql = db();
    const campaigns = await sql`
      SELECT c.*,
             (SELECT count(*)::int FROM pieces p WHERE p.campaign_id = c.id) AS piece_count,
             (SELECT count(*)::int FROM pieces p WHERE p.campaign_id = c.id AND p.status = 'approved') AS approved_count
      FROM campaigns c
      WHERE closed_at IS NULL
      ORDER BY created_at DESC LIMIT 30`;
    return NextResponse.json({ connected: true, campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read campaigns.";
    return NextResponse.json({ connected: true, campaigns: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) {
      return NextResponse.json({ error: "Campaigns need a database." }, { status: 400 });
    }
    const b = await req.json();
    if (!b.name?.trim() || !b.profession?.trim()) {
      return NextResponse.json({ error: "A campaign needs a name and an audience." }, { status: 400 });
    }
    const sql = db();
    const rows = await sql`
      INSERT INTO campaigns (name, profession, objective, theme, layer, starts_on, ends_on, brief, created_by)
      VALUES (${b.name}, ${b.profession}, ${b.objective || null}, ${b.theme || null},
              ${b.layer || "hard"}, ${b.startsOn || null}, ${b.endsOn || null},
              ${b.brief || null}, ${b.createdBy || null})
      RETURNING id`;
    return NextResponse.json({ ok: true, id: Number(rows[0].id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the campaign.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Suggests the asset set for a campaign. The two funnel layers stay separate:
 * a soft layer is educational with no hard CTA, a hard layer drives the action.
 */
export async function PUT(req: Request) {
  try {
    const { layer } = await req.json();
    const soft = layer === "soft";
    const plan = CHANNELS.map((c) => ({
      channel: c.id,
      channelName: c.name,
      format: soft
        ? c.formats[0].id
        : (c.formats[1] || c.formats[0]).id,
      role: soft ? "Educational, no hard CTA" : "Hard CTA, drives the action",
    }));
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: "Could not build a plan." }, { status: 500 });
  }
}
