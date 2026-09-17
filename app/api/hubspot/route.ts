import { NextResponse } from "next/server";
import { pushBlogDraft, pushEmailDraft, testConnection, hubspotReady } from "@/lib/hubspot";
import { db, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET() {
  if (!hubspotReady()) return NextResponse.json({ ready: false });
  try {
    const r = await testConnection();
    return NextResponse.json({ ready: true, ...r });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HubSpot check failed.";
    return NextResponse.json({ ready: true, ok: false, error: message });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.body?.trim() || !b.title?.trim()) {
      return NextResponse.json({ error: "Nothing to push yet." }, { status: 400 });
    }

    // Blocked content never leaves the tool, even as a draft.
    if (b.status === "blocked") {
      return NextResponse.json(
        { error: "This piece is blocked. Clear the compliance failures before pushing it anywhere." },
        { status: 403 }
      );
    }

    const result =
      b.kind === "email"
        ? await pushEmailDraft({
            name: b.title,
            subject: b.subject || b.title,
            body: b.body,
            previewText: b.previewText,
          })
        : await pushBlogDraft({
            title: b.title,
            body: b.body,
            metaDescription: b.metaDescription,
          });

    if (b.pieceId && hasDb()) {
      try {
        const sql = db();
        await sql`UPDATE pieces SET external_ref = ${`hubspot:${b.kind}:${result.id}`} WHERE id = ${b.pieceId}`;
      } catch {
        // The push succeeded; failing to record the reference is not fatal.
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The push failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
