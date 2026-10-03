import { NextResponse } from "next/server";
import { runSearch, resolveSearchKey } from "@/lib/search";
import { authorizeBrandAccess } from "@/lib/brandAccess";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    const { query, news, runtimeKey } = body;
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "A search query is required." }, { status: 400 });
    }
    const { key, provider } = resolveSearchKey(runtimeKey);
    const results = await runSearch(query.trim(), Boolean(news), key, provider);
    return NextResponse.json({ results, provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
