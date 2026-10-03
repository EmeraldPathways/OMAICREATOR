import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { isBrandId } from "@/lib/brandProfiles";
import { getConfiguredBrandProfile } from "@/lib/brandProfileStore";
import { buildImagePrompt, normalizeImageDimensions, persistGeneratedAssets, validImageSignature, validateImageRequest } from "@/lib/imageGeneration";
import { db, hasDb } from "@/lib/db";
import { requireAuthorizedStudioOwner } from "@/lib/ownerAuthorization";
import { resolveOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

type ImageOutput = { b64_json?: string };

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function keyFor(brandId: string) {
  return `generated/${brandId}/${crypto.randomUUID()}.png`;
}

export async function POST(request: Request) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!env.MEDIA || !hasDb()) return NextResponse.json({ error: "Image storage is not configured for this site yet." }, { status: 503 });

  try {
    const form = await request.formData();
    const brandIdValue = String(form.get("brandId") || "");
    if (!isBrandId(brandIdValue)) return NextResponse.json({ error: "Choose a supported business first." }, { status: 400 });
    const brandId = brandIdValue;
    const subject = String(form.get("subject") || "").trim();
    if (!subject) return NextResponse.json({ error: "Describe the image you want to create." }, { status: 400 });
    const profile = await getConfiguredBrandProfile(brandId);
    const reference = form.get("reference");
    const referenceFile = reference instanceof File && reference.size > 0 ? reference : null;
    const variants = Number(form.get("variants") || 1);
    const referenceError = validateImageRequest(variants, referenceFile ? { type: referenceFile.type, size: referenceFile.size } : null);
    if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });
    const width = Number(form.get("width") || 1024);
    const height = Number(form.get("height") || 1024);
    let dimensions: ReturnType<typeof normalizeImageDimensions>;
    try { dimensions = normalizeImageDimensions(width, height); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Choose valid image dimensions." }, { status: 400 }); }

    const useLogo = form.get("useBrandLogo") === "true";
    if (useLogo && !profile.logoObjectKey) return NextResponse.json({ error: "Upload this brand's logo in Brand settings before placing it." }, { status: 400 });
    const references: { bytes: Uint8Array; type: string; name: string }[] = [];
    if (referenceFile) references.push({ bytes: new Uint8Array(await referenceFile.arrayBuffer()), type: referenceFile.type, name: referenceFile.name || "reference.png" });
    if (useLogo && profile.logoObjectKey) {
      const logo = await env.MEDIA.get(profile.logoObjectKey);
      if (!logo || logo.size > 10 * 1024 * 1024) return NextResponse.json({ error: "The saved brand logo is missing or too large to use." }, { status: 400 });
      const type = logo.httpMetadata?.contentType || "";
      const bytes = new Uint8Array(await logo.arrayBuffer());
      if (validateImageRequest(1, { type, size: bytes.length }) || !validImageSignature(type, bytes)) {
        return NextResponse.json({ error: "The saved brand logo is not a supported image." }, { status: 400 });
      }
      // Keep the logo out of the model edit input. ImageStudio composites the
      // saved source bytes over each result and writes the exact PNG to R2.
    }
    if (references.some((item) => !validImageSignature(item.type, item.bytes))) {
      return NextResponse.json({ error: "The reference image data does not match its file type." }, { status: 400 });
    }
    const hasReference = Boolean(referenceFile);
    const textContent = String(form.get("textContent") || "").trim();
    if (form.get("useText") === "true" && !textContent) return NextResponse.json({ error: "Enter the exact text to include in the image." }, { status: 400 });

    const qualityValue = String(form.get("quality") || "high");
    const quality = ["low", "medium", "high", "xhigh", "max"].includes(qualityValue) ? qualityValue : "high";
    const facts = await db()`SELECT label, value FROM brand_facts WHERE brand_id = ${brandId} AND status = 'verified'`;
    const approvedFacts = [...profile.approvedFacts, ...facts.map((fact) => `${String(fact.label)}: ${String(fact.value)}`)];
    const prompt = buildImagePrompt({
      brandId,
      subject,
      style: String(form.get("style") || ""),
      lighting: String(form.get("lighting") || ""),
      composition: String(form.get("composition") || ""),
      lens: String(form.get("lens") || ""),
      mood: String(form.get("mood") || ""),
      avoid: String(form.get("avoid") || ""),
      textContent,
      logoPlacement: "",
      approvedFacts,
      useText: form.get("useText") === "true",
      hasReference,
    });
    const model = hasReference ? "gpt-image-2.5-sunburst" : profile.imageModel;
    const apiKey = resolveOpenAIKey();
    let openAIResponse: Response;
    if (hasReference) {
      const payload = new FormData();
      payload.set("model", model);
      payload.set("prompt", prompt);
      payload.set("n", String(variants));
      payload.set("size", dimensions.providerSize);
      payload.set("quality", quality);
      payload.set("output_format", "png");
      for (const item of references) payload.append("image[]", new Blob([item.bytes], { type: item.type }), item.name);
      openAIResponse = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: payload,
      });
    } else {
      openAIResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt, n: variants, size: dimensions.providerSize, quality, output_format: "png" }),
      });
    }
    if (!openAIResponse.ok) {
      const detail = await openAIResponse.text();
      return NextResponse.json({ error: `Image generation failed (${openAIResponse.status}). ${detail.slice(0, 220)}` }, { status: 502 });
    }
    const result = await openAIResponse.json() as { data?: ImageOutput[] };
    const outputs = (result.data || []).filter((image): image is { b64_json: string } => typeof image.b64_json === "string");
    if (outputs.length !== variants) return NextResponse.json({ error: "The image service returned an incomplete set. Please retry." }, { status: 502 });

    const saved = outputs.map((output) => {
      const bytes = decodeBase64(output.b64_json);
      if (!validImageSignature("image/png", bytes)) throw new Error("The image service returned invalid PNG data.");
      return { objectKey: keyFor(brandId), bytes, brandId, width: dimensions.width, height: dimensions.height, prompt, model, createdBy: authorization.user.userId };
    });
    await persistGeneratedAssets({
      assets: saved,
      put: async (asset) => { await env.MEDIA!.put(asset.objectKey, asset.bytes, { httpMetadata: { contentType: "image/png", cacheControl: "private, no-store" } }); },
      insert: async (asset) => { await db()`INSERT INTO generated_assets (brand_id, object_key, mime_type, width, height, prompt, model, created_by)
        VALUES (${asset.brandId}, ${asset.objectKey}, 'image/png', ${asset.width}, ${asset.height}, ${asset.prompt}, ${asset.model}, ${asset.createdBy})`; },
      deleteObject: async (objectKey) => { await env.MEDIA!.delete(objectKey); },
      deleteMetadata: async (objectKey) => { await db()`DELETE FROM generated_assets WHERE object_key = ${objectKey}`; },
    });

    const sql = db();
    const rows = await Promise.all(saved.map((asset) => sql`SELECT id, brand_id, width, height, model, created_at FROM generated_assets WHERE brand_id = ${brandId} AND object_key = ${asset.objectKey} LIMIT 1`));
    return NextResponse.json({ assets: rows.flat().map((asset) => ({ ...asset, url: `/api/images/${asset.id}?brandId=${brandId}` })) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error && /^(No OpenAI key|The hosted database)/.test(error.message)
      ? error.message
      : "Image generation could not be completed. Check the prompt and storage configuration, then retry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
