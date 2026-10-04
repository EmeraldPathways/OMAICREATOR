import { NextResponse } from "next/server";
import { authorizeBrandAccess } from "@/lib/brandAccess";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export const HISTORY_CHANNELS = ["email", "linkedin", "instagram", "website", "print"] as const;
type HistoryChannel = (typeof HISTORY_CHANNELS)[number];

function isHistoryChannel(value: string): value is HistoryChannel {
  return (HISTORY_CHANNELS as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const access = await authorizeBrandAccess(params.get("brandId") ?? undefined);
  if (!access.ok) return access.response;
  if (!hasDb()) return NextResponse.json({ connected: false, pieces: [] });

  const channel = params.get("channel");
  if (channel && !isHistoryChannel(channel)) {
    return NextResponse.json({ error: "Choose a supported content channel." }, { status: 400 });
  }

  try {
    const sql = db();
    const pieces = channel
      ? await sql`
          SELECT p.id, p.channel, p.format, p.profession, p.topic, p.final_text,
                 p.was_edited, p.status, p.approved_by, p.approved_at, p.verdict
          FROM pieces p
          WHERE p.brand_id = ${access.brandId}
            AND p.retired_at IS NULL
            AND p.channel = ${channel}
          ORDER BY p.approved_at DESC
          LIMIT 100`
      : await sql`
          SELECT p.id, p.channel, p.format, p.profession, p.topic, p.final_text,
                 p.was_edited, p.status, p.approved_by, p.approved_at, p.verdict
          FROM pieces p
          WHERE p.brand_id = ${access.brandId}
            AND p.retired_at IS NULL
          ORDER BY p.approved_at DESC
          LIMIT 100`;

    return NextResponse.json(
      { connected: true, pieces },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read content history.";
    return NextResponse.json({ connected: true, pieces: [], error: message }, { status: 500 });
  }
}
