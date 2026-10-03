import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { isBrandId } from "@/lib/brandProfiles";
import { readPngDimensions, validImageSignature } from "@/lib/imageGeneration";
import { db, hasDb } from "@/lib/db";
import { requireAuthorizedStudioOwner } from "@/lib/ownerAuthorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!env.MEDIA || !hasDb()) return NextResponse.json({ error: "Image storage is temporarily unavailable." }, { status: 503 });
  const { assetId } = await context.params;
  const id = Number(assetId);
  const brandId = new URL(request.url).searchParams.get("brandId") || "omega-financial";
  if (!Number.isSafeInteger(id) || id < 1 || !isBrandId(brandId)) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  try {
    const rows = await db()`SELECT object_key, mime_type FROM generated_assets WHERE id = ${id} AND brand_id = ${brandId} LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ error: "Image not found." }, { status: 404 });
    const object = await env.MEDIA.get(String(rows[0].object_key));
    if (!object) return NextResponse.json({ error: "Image file not found." }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type": String(rows[0].mime_type || "image/png"),
        "content-length": String(object.size),
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="content-studio-${id}.png"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image could not be retrieved." }, { status: 503 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!env.MEDIA || !hasDb()) return NextResponse.json({ error: "Image storage is temporarily unavailable." }, { status: 503 });
  const { assetId } = await context.params;
  const id = Number(assetId);
  const brandId = new URL(request.url).searchParams.get("brandId") || "omega-financial";
  if (!Number.isSafeInteger(id) || id < 1 || !isBrandId(brandId)) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "image/png") {
    return NextResponse.json({ error: "The finished image must be a PNG." }, { status: 415 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 25 * 1024 * 1024) return NextResponse.json({ error: "The finished image is too large." }, { status: 413 });
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length > 25 * 1024 * 1024 || !validImageSignature("image/png", bytes)) {
      return NextResponse.json({ error: "The finished image is not a valid PNG." }, { status: 400 });
    }
    const dimensions = readPngDimensions(bytes);
    if (!dimensions) return NextResponse.json({ error: "The finished PNG has no valid dimensions." }, { status: 400 });
    const rows = await db()`SELECT object_key, width, height FROM generated_assets WHERE id = ${id} AND brand_id = ${brandId} LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ error: "Image not found." }, { status: 404 });
    if (Number(rows[0].width) !== dimensions.width || Number(rows[0].height) !== dimensions.height) {
      return NextResponse.json({ error: "The finished image dimensions do not match this saved asset." }, { status: 400 });
    }
    await env.MEDIA.put(String(rows[0].object_key), bytes, {
      httpMetadata: { contentType: "image/png", cacheControl: "private, no-store" },
    });
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "The finished image could not be saved." }, { status: 503 });
  }
}
