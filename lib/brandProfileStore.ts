import { db, hasDb } from "./db";
import { getBrandProfile, type BrandId } from "./brandProfiles";
import { mergeBrandProfile } from "./brandProfileValidation";

/** Non-Omega callers must already have passed authorizeBrandAccess. */
export async function getConfiguredBrandProfile(brandId: BrandId) {
  const fallback = getBrandProfile(brandId);
  if (!hasDb()) return fallback;
  try {
    const rows = await db()`SELECT settings_json, logo_object_key FROM brand_profiles WHERE brand_id = ${brandId} LIMIT 1`;
    if (!rows.length) return fallback;
    let settings: unknown = null;
    try { settings = JSON.parse(String(rows[0].settings_json || "{}")); } catch { settings = null; }
    const profile = mergeBrandProfile(brandId, settings);
    profile.logoObjectKey = typeof rows[0].logo_object_key === "string" ? rows[0].logo_object_key : null;
    return profile;
  } catch {
    return fallback;
  }
}
