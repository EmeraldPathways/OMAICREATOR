import { getBrandProfile, type BrandId, type BrandProfile, type ImagePreset } from "./brandProfiles";

export type EditableBrandProfile = Omit<BrandProfile, "id" | "logoObjectKey">;

const editableKeys = [
  "name", "voice", "audiences", "approvedFacts", "prohibitedClaims", "palette", "websiteUrl", "gscSiteUrl", "ga4PropertyId",
  "channels", "formats", "defaultImageStyle", "defaultLighting", "defaultComposition",
  "avoidList", "imageModel", "imagePresets",
] as const;

export function parseBrandProfilePatch(value: unknown): Partial<EditableBrandProfile> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Profile settings must be an object.");
  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!(editableKeys as readonly string[]).includes(key)) throw new Error(`Profile field is not editable: ${key}`);
  }

  const output: Record<string, unknown> = {};
  for (const key of editableKeys) {
    if (!(key in input)) continue;
    const field = input[key];
    if (key === "websiteUrl") {
      if (typeof field !== "string" || field.length > 255) throw new Error("Website must be a valid public website URL.");
      const value = field.trim();
      if (!value) { output[key] = ""; continue; }
      let url: URL;
      try { url = new URL(value); } catch { throw new Error("Website must be a valid public website URL."); }
      const host = url.hostname.toLowerCase();
      const privateHost = host === "localhost" || host.endsWith(".localhost") || host === "::1" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password || !host.includes(".") || privateHost) throw new Error("Website must be a valid public website URL.");
      output[key] = url.toString().replace(/\/$/, "");
      continue;
    }
    if (key === "gscSiteUrl") {
      if (typeof field !== "string" || field.length > 255 || (field.trim() && !/^(sc-domain:[a-z0-9.-]+|https?:\/\/[^\s]+)$/i.test(field.trim()))) throw new Error("Search Console property is invalid.");
      output[key] = field.trim();
      continue;
    }
    if (key === "ga4PropertyId") {
      if (typeof field !== "string" || field.length > 24 || (field.trim() && !/^\d{1,20}$/.test(field.trim()))) throw new Error("GA4 property ID must contain digits only.");
      output[key] = field.trim();
      continue;
    }
    if (["name", "voice", "defaultImageStyle", "defaultLighting", "defaultComposition"].includes(key)) {
      if (typeof field !== "string" || field.length > 4000) throw new Error(`${key} must be text up to 4,000 characters.`);
      if (key === "name" && !field.trim()) throw new Error("Brand name cannot be empty.");
      output[key] = field.trim();
      continue;
    }
    if (["audiences", "approvedFacts", "prohibitedClaims", "channels", "formats", "avoidList"].includes(key)) {
      if (!Array.isArray(field) || field.length > 100 || field.some((entry) => typeof entry !== "string" || entry.length > 1000)) {
        throw new Error(`${key} must be a list of up to 100 text entries.`);
      }
      output[key] = field.map((entry) => (entry as string).trim()).filter(Boolean);
      continue;
    }
    if (key === "palette") {
      if (!Array.isArray(field) || field.length > 24 || field.some((color) => typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))) {
        throw new Error("Palette must contain up to 24 six-digit hexadecimal colours.");
      }
      output[key] = field;
      continue;
    }
    if (key === "imageModel") {
      if (field !== "gpt-image-2.5-flare" && field !== "gpt-image-2.5-sunburst") throw new Error("Unsupported image model.");
      output[key] = field;
      continue;
    }
    if (key === "imagePresets") {
      if (!Array.isArray(field) || field.length > 24) throw new Error("Image presets must be a list of up to 24 entries.");
      output[key] = field.map(validatePreset);
    }
  }
  return output as Partial<EditableBrandProfile>;
}

function validatePreset(value: unknown): ImagePreset {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Each image preset must be an object.");
  const preset = value as Record<string, unknown>;
  if (typeof preset.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(preset.id)) throw new Error("Image preset ID is invalid.");
  if (typeof preset.label !== "string" || !preset.label.trim() || preset.label.length > 80) throw new Error("Image preset label is invalid.");
  for (const key of ["width", "height"] as const) {
    if (!Number.isInteger(preset[key]) || (preset[key] as number) < 1 || (preset[key] as number) > 3840) throw new Error(`Image preset ${key} is invalid.`);
  }
  return { id: preset.id, label: preset.label.trim(), width: preset.width as number, height: preset.height as number };
}

export function mergeBrandProfile(id: BrandId, stored: unknown): BrandProfile {
  const base = getBrandProfile(id);
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return base;
  const parsed = parseBrandProfilePatch(stored);
  return { ...base, ...parsed, id, logoObjectKey: base.logoObjectKey };
}
