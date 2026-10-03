import assert from "node:assert/strict";
import test from "node:test";

const load = () => import("../lib/imageGeneration.ts");

test("normalizes standard and custom image dimensions to provider-safe multiples of 16", async () => {
  const { normalizeImageDimensions } = await load();
  assert.deepEqual(normalizeImageDimensions(1024, 1024), { width: 1024, height: 1024, providerSize: "1024x1024" });
  assert.deepEqual(normalizeImageDimensions(1536, 1024), { width: 1536, height: 1024, providerSize: "1536x1024" });
  assert.deepEqual(normalizeImageDimensions(1200, 1600), { width: 1200, height: 1600, providerSize: "1200x1600" });
});

test("rejects image sizes outside provider pixel, edge, and aspect limits", async () => {
  const { normalizeImageDimensions } = await load();
  for (const [width, height] of [[0, 1024], [1.5, 1024], [3841, 1024], [3840, 512], [1024, 341], [4096, 4096]]) {
    assert.throws(() => normalizeImageDimensions(width, height));
  }
});

test("builds a realistic product prompt with only the selected brand context", async () => {
  const { buildImagePrompt } = await load();
  const prompt = buildImagePrompt({
    brandId: "graduation-hoodies", subject: "students wearing class hoodies", style: "editorial product photography",
    lighting: "soft late afternoon window light", composition: "waist-up group with negative space above",
    lens: "50mm", mood: "celebratory but natural", avoid: "watermarks", approvedFacts: ["Hoodies are made to order"], useText: false, hasReference: false,
  });
  assert.match(prompt, /Graduation Hoodies/);
  assert.match(prompt, /#EA581F/);
  assert.match(prompt, /fabric weave|stitching/i);
  assert.match(prompt, /natural skin texture|realistic materials/i);
  assert.match(prompt, /Hoodies are made to order/);
  assert.doesNotMatch(prompt, /Omega Financial|insurance|pension/i);
});

test("limits variants and accepts only supported reference image types and sizes", async () => {
  const { validateImageRequest } = await load();
  assert.equal(validateImageRequest(1, null), null);
  assert.equal(validateImageRequest(4, { type: "image/png", size: 10 * 1024 * 1024 }), null);
  assert.match(validateImageRequest(0, null) || "", /one to four/i);
  assert.match(validateImageRequest(5, null) || "", /one to four/i);
  assert.match(validateImageRequest(1, { type: "image/gif", size: 20 }) || "", /PNG, JPEG or WebP/i);
  assert.match(validateImageRequest(1, { type: "image/png", size: 10 * 1024 * 1024 + 1 }) || "", /10 MB/i);
});

test("checks image file signatures instead of trusting a filename or declared content type", async () => {
  const { validImageSignature } = await load();
  assert.equal(validImageSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), true);
  assert.equal(validImageSignature("image/png", new Uint8Array([0xff, 0xd8, 0xff])), false);
  assert.equal(validImageSignature("image/webp", new TextEncoder().encode("RIFF1234WEBP")), true);
});

test("calculates exact logo overlays inside the safe area", async () => {
  const { computeLogoOverlay } = await load();
  assert.deepEqual(computeLogoOverlay(1000, 1000, 100, 50, "near the lower-right edge"), { x: 840, y: 890, width: 100, height: 50 });
  assert.deepEqual(computeLogoOverlay(1000, 1000, 100, 50, "near the lower-left edge"), { x: 60, y: 890, width: 100, height: 50 });
  assert.deepEqual(computeLogoOverlay(1000, 1000, 100, 50, "small and centred near the bottom edge"), { x: 450, y: 890, width: 100, height: 50 });
});

test("reads dimensions from a PNG header for safe in-place asset replacement", async () => {
  const { readPngDimensions } = await load();
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 1200, false);
  view.setUint32(20, 600, false);
  assert.deepEqual(readPngDimensions(bytes), { width: 1200, height: 600 });
  assert.equal(readPngDimensions(new Uint8Array(12)), null);
});

test("removes every stored object and metadata row if a batch persistence step fails", async () => {
  const { persistGeneratedAssets } = await load();
  const stored: string[] = [];
  const metadata: string[] = [];
  const deleted: string[] = [];
  const metadataDeleted: string[] = [];
  await assert.rejects(() => persistGeneratedAssets({
    assets: [{ objectKey: "a.png", bytes: new Uint8Array([1]) }, { objectKey: "b.png", bytes: new Uint8Array([2]) }],
    put: async (asset) => { stored.push(asset.objectKey); },
    insert: async (asset) => { metadata.push(asset.objectKey); if (asset.objectKey === "b.png") throw new Error("D1 unavailable"); },
    deleteObject: async (key) => { deleted.push(key); },
    deleteMetadata: async (key) => { metadataDeleted.push(key); },
  }));
  assert.deepEqual(stored, ["a.png", "b.png"]);
  assert.deepEqual(deleted, ["a.png", "b.png"]);
  assert.deepEqual(metadataDeleted, ["a.png", "b.png"]);
});
