import { getBrandProfile, type BrandId } from "./brandProfiles";

const MIN_PIXELS = 655_360;
const MAX_PIXELS = 8_294_400;
const MAX_EDGE = 3840;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export function describeImageGenerationError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name || "Error", message: error.message || "Unknown error" };
  return { name: "UnknownError", message: String(error) };
}

export function formatAssetCreatedAt(value: string | null | undefined, locale = "en-IE"): string {
  if (!value || value === "CURRENT_TIMESTAMP") return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(locale);
}

export function normalizeImageDimensions(width: number, height: number): { width: number; height: number; providerSize: string } {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Image width and height must be positive whole numbers.");
  }
  const ratio = Math.max(width, height) / Math.min(width, height);
  const pixels = width * height;
  if (Math.max(width, height) > MAX_EDGE || ratio > 3 || pixels < MIN_PIXELS || pixels > MAX_PIXELS) {
    throw new Error("Choose dimensions within the supported image size limits.");
  }
  const normalizedWidth = Math.max(16, Math.round(width / 16) * 16);
  const normalizedHeight = Math.max(16, Math.round(height / 16) * 16);
  const normalizedPixels = normalizedWidth * normalizedHeight;
  const normalizedRatio = Math.max(normalizedWidth, normalizedHeight) / Math.min(normalizedWidth, normalizedHeight);
  if (Math.max(normalizedWidth, normalizedHeight) > MAX_EDGE || normalizedRatio > 3 || normalizedPixels < MIN_PIXELS || normalizedPixels > MAX_PIXELS) {
    throw new Error("These dimensions cannot be safely aligned to the image model's 16-pixel grid.");
  }
  return { width: normalizedWidth, height: normalizedHeight, providerSize: `${normalizedWidth}x${normalizedHeight}` };
}

export interface ImagePromptInput {
  brandId: BrandId;
  subject: string;
  style: string;
  lighting: string;
  composition: string;
  lens: string;
  mood: string;
  avoid: string;
  textContent?: string;
  logoPlacement?: string;
  approvedFacts: string[];
  useText: boolean;
  hasReference: boolean;
}

export function buildImagePrompt(input: ImagePromptInput): string {
  const profile = getBrandProfile(input.brandId);
  const palette = profile.palette.length ? `Use this brand palette with restraint: ${profile.palette.join(", ")}.` : "Do not invent or imply a brand palette; use a natural, coherent colour grade.";
  const facts = input.approvedFacts.length
    ? `Only these approved brand facts may inform the scene: ${input.approvedFacts.join("; ")}. Do not invent product, service, origin, price, performance, environmental, or delivery claims.`
    : "Do not add factual product or service claims, labels, prices, guarantees, logos, or text.";
  const textRule = input.useText
    ? `Include only these exact user-supplied words, rendered cleanly and spelled correctly: “${input.textContent || ""}”. Keep typography separate from product details.`
    : "No visible text, letters, numbers, signage, watermarks, or pseudo-logos.";
  const referenceRule = input.hasReference
    ? "Treat the reference as a source of the exact supplied subject/product identity. Preserve its distinctive colours, shape, material and marks; change only what the brief requests."
    : "Create a new scene that looks like a real commissioned commercial photograph.";
  const logoRule = input.logoPlacement
    ? `Use the supplied brand logo as an exact reference; preserve its design and place it ${input.logoPlacement}. Do not redraw, alter, or add any other logo.`
    : "Do not add or imitate a logo.";
  const avoid = [input.avoid, ...profile.avoidList].filter(Boolean).join(", ");

  return [
    `Create a highly realistic brand image for ${profile.name}.`,
    `Subject and action: ${input.subject}.`,
    `Brand voice and audience context: ${profile.voice} Audience: ${profile.audiences.join(", ") || "general customers"}.`,
    `Visual style: ${input.style || profile.defaultImageStyle || "photorealistic commercial photography"}. Mood: ${input.mood || "confident, natural, and approachable"}.`,
    `Lighting: ${input.lighting || profile.defaultLighting || "soft, directional natural light with physically plausible shadows and reflections"}.`,
    `Composition: ${input.composition || profile.defaultComposition || "clear subject hierarchy, deliberate framing, realistic perspective, and uncluttered negative space"}. Lens and capture: ${input.lens || "50mm full-frame lens"}, natural perspective, realistic depth of field, crisp focus on the main subject.`,
    "Prioritise convincing human anatomy and expressions, natural skin texture, accurate object geometry, coherent contact and cast shadows, physically plausible reflections, subtle surface wear, realistic material response, believable fine texture, natural colour response, and consistent lighting across the scene.",
    "Render fabric weave, seams and embroidery; paint, glass, metal, water and skin with material-appropriate texture where they appear. Keep fine details sharp without excessive artificial sharpening, plastic skin, repeated patterns, warped edges, or synthetic glow.",
    palette,
    facts,
    textRule,
    logoRule,
    referenceRule,
    avoid ? `Avoid: ${avoid}.` : "Avoid visual artifacts, distorted hands, duplicated parts, floating objects, implausible reflections, and oversaturated colours.",
  ].join("\n\n");
}

export function validateImageRequest(variants: number, reference: { type: string; size: number } | null): string | null {
  if (!Number.isInteger(variants) || variants < 1 || variants > 4) return "Choose one to four image variants.";
  if (!reference) return null;
  if (!SUPPORTED_MIME.has(reference.type.toLowerCase())) return "Reference images must be PNG, JPEG or WebP.";
  if (!Number.isInteger(reference.size) || reference.size <= 0 || reference.size > MAX_REFERENCE_BYTES) return "Reference images must be no larger than 10 MB.";
  return null;
}

export function validImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!validImageSignature("image/png", bytes) || bytes.length < 24) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return width > 0 && height > 0 ? { width, height } : null;
}

export function computeLogoOverlay(
  imageWidth: number,
  imageHeight: number,
  logoWidth: number,
  logoHeight: number,
  placement: string,
): { x: number; y: number; width: number; height: number } {
  const safe = Math.min(imageWidth, imageHeight) * 0.06;
  const scale = Math.min(imageWidth * 0.2 / logoWidth, imageHeight * 0.15 / logoHeight, 1);
  const width = Math.max(1, Math.round(logoWidth * scale));
  const height = Math.max(1, Math.round(logoHeight * scale));
  const x = placement.includes("lower-left")
    ? safe
    : placement.includes("centred") || placement.includes("centered")
      ? (imageWidth - width) / 2
      : imageWidth - width - safe;
  const y = imageHeight - height - safe;
  return { x: Math.round(x), y: Math.round(y), width, height };
}

export async function persistGeneratedAssets<T extends { objectKey: string }>(input: {
  assets: T[];
  put: (asset: T) => Promise<void>;
  insert: (asset: T) => Promise<void>;
  deleteObject: (objectKey: string) => Promise<void>;
  deleteMetadata: (objectKey: string) => Promise<void>;
}): Promise<void> {
  try {
    for (const asset of input.assets) await input.put(asset);
    for (const asset of input.assets) await input.insert(asset);
  } catch (error) {
    await Promise.allSettled(input.assets.flatMap((asset) => [input.deleteMetadata(asset.objectKey), input.deleteObject(asset.objectKey)]));
    throw error;
  }
}
