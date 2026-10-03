import { NextResponse } from "next/server";
import { BRAND_PROFILES, isBrandId, type BrandId, type BrandProfile } from "@/lib/brandProfiles";
import { mergeBrandProfile, parseBrandProfilePatch } from "@/lib/brandProfileValidation";
import { db, hasDb } from "@/lib/db";
import { requireAuthorizedStudioOwner } from "@/lib/ownerAuthorization";

export const runtime = "nodejs";
export const maxDuration = 30;

function editableProfile(profile: BrandProfile) {
  const settings: Record<string, unknown> = { ...profile };
  delete settings.id;
  delete settings.logoObjectKey;
  return settings;
}

export async function GET() {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!hasDb()) return NextResponse.json({ error: "Brand settings are temporarily unavailable." }, { status: 503 });

  try {
    const rows = await db()`SELECT brand_id, settings_json, logo_object_key FROM brand_profiles`;
    const saved = new Map(rows.map((row) => [String(row.brand_id), row]));
    const brands = Object.keys(BRAND_PROFILES).map((brandId) => {
      const row = saved.get(brandId);
      let settings: unknown = null;
      if (row?.settings_json) {
        try { settings = JSON.parse(String(row.settings_json)); } catch { settings = null; }
      }
      const profile = mergeBrandProfile(brandId as BrandId, settings);
      profile.logoObjectKey = typeof row?.logo_object_key === "string" ? row.logo_object_key : null;
      return profile;
    });
    return NextResponse.json({ brands }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Brand settings could not be loaded." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!hasDb()) return NextResponse.json({ error: "Brand settings are temporarily unavailable." }, { status: 503 });

  try {
    const body = await request.json() as { brandId?: unknown; settings?: unknown };
    if (!isBrandId(body.brandId)) return NextResponse.json({ error: "Choose a supported brand." }, { status: 400 });
    const patch = parseBrandProfilePatch(body.settings);
    if (!Object.keys(patch).length) return NextResponse.json({ error: "Add at least one setting before saving." }, { status: 400 });

    const sql = db();
    const rows = await sql`SELECT settings_json, logo_object_key FROM brand_profiles WHERE brand_id = ${body.brandId} LIMIT 1`;
    let existing: unknown = null;
    if (rows[0]?.settings_json) {
      try { existing = JSON.parse(String(rows[0].settings_json)); } catch { existing = null; }
    }
    const merged = { ...editableProfile(mergeBrandProfile(body.brandId, existing)), ...patch };
    await sql`INSERT INTO brand_profiles (brand_id, settings_json, updated_by, updated_at)
      VALUES (${body.brandId}, ${JSON.stringify(merged)}, ${authorization.user.userId}, CURRENT_TIMESTAMP)
      ON CONFLICT(brand_id) DO UPDATE SET settings_json = excluded.settings_json,
        updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`;
    return NextResponse.json({ ok: true, brand: mergeBrandProfile(body.brandId, merged) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error && /^(Profile|Palette|Image|Brand|Website|Search Console|GA4|audiences|approvedFacts|prohibitedClaims|channels|formats|avoidList|name|voice|default)/.test(error.message)
      ? error.message
      : "Brand settings could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
