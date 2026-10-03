import { NextResponse } from "next/server";
import { isBrandId } from "@/lib/brandProfiles";
import { db, hasDb } from "@/lib/db";
import { requireAuthorizedStudioOwner } from "@/lib/ownerAuthorization";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!hasDb()) return NextResponse.json({ error: "Image history is temporarily unavailable." }, { status: 503 });
  const brandId = new URL(request.url).searchParams.get("brandId") || "omega-financial";
  if (!isBrandId(brandId)) return NextResponse.json({ error: "Choose a supported business." }, { status: 400 });
  try {
    const rows = await db()`SELECT id, brand_id, width, height, prompt, model, created_at FROM generated_assets WHERE brand_id = ${brandId} ORDER BY id DESC LIMIT 60`;
    return NextResponse.json({ assets: rows.map((asset) => ({ ...asset, url: `/api/images/${asset.id}?brandId=${brandId}` })) }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Image history could not be loaded." }, { status: 503 });
  }
}
