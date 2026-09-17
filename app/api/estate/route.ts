import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { scanUrl, factNote } from "@/lib/estate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (!hasDb()) return NextResponse.json({ connected: false, findings: [] });
  try {
    const sql = db();
    const findings = await sql`
      SELECT id, url, page_title, fact_id, kind, excerpt, found_at
      FROM estate_findings WHERE resolved_at IS NULL
      ORDER BY found_at DESC LIMIT 200`;
    return NextResponse.json({
      connected: true,
      findings: findings.map((f) => ({ ...f, note: factNote(String(f.fact_id)) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read findings.";
    return NextResponse.json({ connected: true, findings: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();
    const list: string[] = (urls || "")
      .split(/[\s,]+/)
      .map((u: string) => u.trim())
      .filter(Boolean)
      .slice(0, 25);

    if (!list.length) {
      return NextResponse.json({ error: "Give it at least one URL to scan." }, { status: 400 });
    }

    const found: unknown[] = [];
    const errors: string[] = [];

    for (const url of list) {
      if (!/^https?:\/\//i.test(url)) {
        errors.push(`${url} — needs to start with http:// or https://`);
        continue;
      }
      try {
        const hits = await scanUrl(url);
        for (const h of hits) found.push({ ...h, note: factNote(h.factId) });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `${url} could not be fetched`);
      }
    }

    if (hasDb()) {
      try {
        const sql = db();
        for (const h of found as { url: string; pageTitle: string; factId: string; kind: string; excerpt: string }[]) {
          const dup = await sql`
            SELECT id FROM estate_findings
            WHERE url = ${h.url} AND fact_id = ${h.factId} AND excerpt = ${h.excerpt}
              AND resolved_at IS NULL LIMIT 1`;
          if (!dup.length) {
            await sql`
              INSERT INTO estate_findings (url, page_title, fact_id, kind, excerpt)
              VALUES (${h.url}, ${h.pageTitle}, ${h.factId}, ${h.kind}, ${h.excerpt})`;
          }
        }
      } catch {
        // Scanning still returns results even if the store is unavailable.
      }
    }

    return NextResponse.json({ scanned: list.length, found, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const sql = db();
    await sql`UPDATE estate_findings SET resolved_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not close the finding.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
