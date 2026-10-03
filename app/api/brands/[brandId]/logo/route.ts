import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { isBrandId } from "@/lib/brandProfiles";
import { db, hasDb } from "@/lib/db";
import { requireAuthorizedStudioOwner } from "@/lib/ownerAuthorization";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const TYPES = {
  "image/png": { extension: "png", signature: [137, 80, 78, 71, 13, 10, 26, 10] },
  "image/jpeg": { extension: "jpg", signature: [255, 216, 255] },
  "image/webp": { extension: "webp", signature: [82, 73, 70, 70] },
} as const;

type RouteContext = { params: Promise<{ brandId: string }> };

function isValidSignature(type: keyof typeof TYPES, bytes: Uint8Array): boolean {
  const signature = TYPES[type].signature;
  if (!signature.every((byte, index) => bytes[index] === byte)) return false;
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return true;
}

export async function GET(_request: Request, context: RouteContext) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  const { brandId } = await context.params;
  if (!isBrandId(brandId)) return NextResponse.json({ error: "Choose a supported brand." }, { status: 400 });
  if (!hasDb() || !env.MEDIA) return NextResponse.json({ error: "Brand image storage is unavailable." }, { status: 503 });

  try {
    const rows = await db()`SELECT logo_object_key FROM brand_profiles WHERE brand_id = ${brandId} LIMIT 1`;
    if (!rows[0]?.logo_object_key) return NextResponse.json({ error: "No logo has been uploaded for this brand." }, { status: 404 });
    const object = await env.MEDIA.get(String(rows[0].logo_object_key));
    if (!object) return NextResponse.json({ error: "The saved logo is unavailable." }, { status: 404 });
    const headers = new Headers({
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    });
    return new Response(object.body, { headers });
  } catch {
    return NextResponse.json({ error: "The saved logo could not be loaded." }, { status: 503 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  const { brandId } = await context.params;
  if (!isBrandId(brandId)) return NextResponse.json({ error: "Choose a supported brand." }, { status: 400 });
  if (!hasDb() || !env.MEDIA) return NextResponse.json({ error: "Brand image storage is unavailable." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Select a PNG, JPEG, or WebP logo." }, { status: 400 });
  if (file.size < 1 || file.size > MAX_LOGO_BYTES) return NextResponse.json({ error: "Logo must be no larger than 10 MB." }, { status: 400 });
  if (!(file.type in TYPES)) return NextResponse.json({ error: "Logo must be PNG, JPEG, or WebP." }, { status: 415 });

  const type = file.type as keyof typeof TYPES;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isValidSignature(type, bytes)) return NextResponse.json({ error: "The selected file does not match its image type." }, { status: 400 });
  const key = `brands/${brandId}/logo/${crypto.randomUUID()}.${TYPES[type].extension}`;
  let uploaded = false;
  try {
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
    uploaded = true;
    const sql = db();
    const rows = await sql`SELECT logo_object_key FROM brand_profiles WHERE brand_id = ${brandId} LIMIT 1`;
    const oldKey = rows[0]?.logo_object_key ? String(rows[0].logo_object_key) : null;
    await sql`INSERT INTO brand_profiles (brand_id, settings_json, logo_object_key, updated_by, updated_at)
      VALUES (${brandId}, '{}', ${key}, ${authorization.user.userId}, CURRENT_TIMESTAMP)
      ON CONFLICT(brand_id) DO UPDATE SET logo_object_key = excluded.logo_object_key,
        updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`;
    if (oldKey && oldKey !== key) await env.MEDIA.delete(oldKey).catch(() => undefined);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    if (uploaded) await env.MEDIA.delete(key).catch(() => undefined);
    return NextResponse.json({ error: "Logo upload could not be saved." }, { status: 503 });
  }
}
