import { NextResponse } from "next/server";
import { initSchema, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  try {
    if (!hasDb()) {
      return NextResponse.json(
        { error: "No DATABASE_URL. Add the Neon integration in Vercel > Storage, then redeploy." },
        { status: 400 }
      );
    }
    const result = await initSchema();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Schema setup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
