"use client";

import { useEffect, useMemo, useState } from "react";
import type { BrandProfile, ImagePreset } from "@/lib/brandProfiles";
import { computeLogoOverlay } from "@/lib/imageGeneration";

interface CampaignSeed { topic: string; brief?: string; }
interface Asset { id: number; width: number; height: number; model: string; created_at: string; url: string; prompt?: string; }

const STARTER_PRESETS: ImagePreset[] = [
  { id: "square", label: "Square · 1:1", width: 1024, height: 1024 },
  { id: "portrait", label: "Portrait · 2:3", width: 1024, height: 1536 },
  { id: "landscape", label: "Landscape · 3:2", width: 1536, height: 1024 },
  { id: "story", label: "Story · 9:16", width: 1024, height: 1792 },
];

async function compositeExactLogo(asset: Asset, logoFile: Blob, placement: string): Promise<Blob> {
  const baseResponse = await fetch(asset.url, { cache: "no-store" });
  if (!baseResponse.ok) throw new Error("The generated image could not be loaded for logo placement.");
  const [baseBitmap, logoBitmap] = await Promise.all([
    baseResponse.blob().then(createImageBitmap),
    createImageBitmap(logoFile),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = asset.width;
  canvas.height = asset.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot place the saved logo on the image.");
  context.drawImage(baseBitmap, 0, 0, asset.width, asset.height);
  const overlay = computeLogoOverlay(asset.width, asset.height, logoBitmap.width, logoBitmap.height, placement);
  context.drawImage(logoBitmap, overlay.x, overlay.y, overlay.width, overlay.height);
  baseBitmap.close();
  logoBitmap.close();
  const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!output) throw new Error("The exact logo overlay could not be encoded as PNG.");
  return output;
}

export default function ImageStudio({ brand, campaignSeed, onClearCampaignSeed }: { brand: BrandProfile; campaignSeed?: CampaignSeed; onClearCampaignSeed: () => void }) {
  const presets = useMemo(() => [...brand.imagePresets, ...STARTER_PRESETS.filter((preset) => !brand.imagePresets.some((item) => item.width === preset.width && item.height === preset.height))], [brand]);
  const [subject, setSubject] = useState(campaignSeed?.topic || "");
  const [style, setStyle] = useState(brand.defaultImageStyle);
  const [lighting, setLighting] = useState(brand.defaultLighting);
  const [composition, setComposition] = useState(campaignSeed?.brief || brand.defaultComposition);
  const [lens, setLens] = useState("50mm full-frame lens");
  const [mood, setMood] = useState("Natural and confident");
  const [avoid, setAvoid] = useState(brand.avoidList.join(", "));
  const [width, setWidth] = useState(brand.imagePresets[0]?.width || 1024);
  const [height, setHeight] = useState(brand.imagePresets[0]?.height || 1024);
  const [preset, setPreset] = useState("custom");
  const [variants, setVariants] = useState(1);
  const [quality, setQuality] = useState("high");
  const [reference, setReference] = useState<File | null>(null);
  const [useBrandLogo, setUseBrandLogo] = useState(false);
  const [logoPlacement, setLogoPlacement] = useState("near the lower-right edge, with clear padding");
  const [useText, setUseText] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => { void loadHistory(brand.id); }, [brand.id]);

  async function loadHistory(brandId: string) {
    try {
      const response = await fetch(`/api/images?brandId=${encodeURIComponent(brandId)}`);
      const data = await response.json();
      if (response.ok) setAssets(data.assets || []);
    } catch { /* history remains optional if storage is unavailable */ }
  }

  function applyPreset(id: string) {
    setPreset(id);
    const selected = presets.find((item) => item.id === id);
    if (selected) { setWidth(selected.width); setHeight(selected.height); }
  }

  async function generate() {
    if (!subject.trim()) { setMessage("Describe the image you want to create."); return; }
    const data = new FormData();
    data.set("brandId", brand.id); data.set("subject", subject.trim()); data.set("style", style);
    data.set("lighting", lighting); data.set("composition", composition); data.set("lens", lens); data.set("mood", mood);
    data.set("avoid", avoid); data.set("width", String(width)); data.set("height", String(height));
    data.set("variants", String(variants)); data.set("quality", quality); data.set("useBrandLogo", String(useBrandLogo));
    data.set("logoPlacement", logoPlacement); data.set("useText", String(useText)); data.set("textContent", textContent);
    if (reference) data.set("reference", reference);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/images/generate", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Image generation failed.");
      const created = (result.assets || []) as Asset[];
      if (useBrandLogo && created.length) {
        const logoResponse = await fetch(`/api/brands/${brand.id}/logo`, { cache: "no-store" });
        if (!logoResponse.ok) throw new Error("Images were created, but the saved logo could not be loaded for exact placement.");
        const logoFile = await logoResponse.blob();
        for (const asset of created) {
          const finishedPng = await compositeExactLogo(asset, logoFile, logoPlacement);
          const saved = await fetch(asset.url, { method: "PUT", headers: { "Content-Type": "image/png" }, body: finishedPng, cache: "no-store" });
          const savedResult = await saved.json();
          if (!saved.ok) throw new Error(savedResult.error || "The generated image could not be saved with the exact logo.");
        }
      }
      setAssets((current) => [...created, ...current]);
      setMessage(`${created.length} image${created.length === 1 ? "" : "s"} created and saved to ${brand.name}.`);
      if (campaignSeed) onClearCampaignSeed();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image generation failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="column image-studio">
      {campaignSeed && <div className="verdict ready"><strong>Matching image brief</strong><p>{campaignSeed.topic}{campaignSeed.brief ? ` · ${campaignSeed.brief}` : ""} <button className="btn-quiet" onClick={onClearCampaignSeed}>Clear handoff</button></p></div>}
      {message && <div className={message.includes("created and saved") ? "verdict ready" : "alert"} role="status">{message}</div>}
      <section className="panel">
        <div className="panel-head"><div><h2>Create an image for {brand.name}</h2><span className="hint">Realistic product photography, kept inside this brand&apos;s visual settings</span></div></div>
        <div className="panel-body">
            <div className="field"><label htmlFor="image-subject">What should be in the image?</label><textarea id="image-subject" rows={3} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Describe the subject, action, location and the moment you want to capture." /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="image-style">Style</label><input id="image-style" value={style} onChange={(event) => setStyle(event.target.value)} placeholder="Photorealistic commercial photography" /></div>
            <div className="field"><label htmlFor="image-mood">Mood</label><input id="image-mood" value={mood} onChange={(event) => setMood(event.target.value)} /></div>
            <div className="field"><label htmlFor="image-lighting">Lighting</label><input id="image-lighting" value={lighting} onChange={(event) => setLighting(event.target.value)} placeholder="Soft window light, natural shadows" /></div>
            <div className="field"><label htmlFor="image-lens">Lens</label><input id="image-lens" value={lens} onChange={(event) => setLens(event.target.value)} placeholder="35mm, 50mm, macro" /></div>
          </div>
          <div className="field"><label htmlFor="image-composition">Composition and placement</label><textarea id="image-composition" rows={2} value={composition} onChange={(event) => setComposition(event.target.value)} placeholder="Subject position, crop, perspective and space reserved for copy." /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="image-preset">Orientation preset</label><select id="image-preset" value={preset} onChange={(event) => applyPreset(event.target.value)}><option value="custom">Custom dimensions</option>{presets.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.width} × {item.height}</option>)}</select></div>
            <div className="field"><label htmlFor="image-quality">Output quality</label><select id="image-quality" value={quality} onChange={(event) => setQuality(event.target.value)}><option value="medium">Medium · draft</option><option value="high">High · recommended</option><option value="xhigh">Extra high</option><option value="max">Maximum detail</option></select></div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="image-width">Width in pixels</label><input id="image-width" type="number" min={16} max={3840} step={16} value={width} onChange={(event) => { setPreset("custom"); setWidth(Number(event.target.value)); }} /></div>
            <div className="field"><label htmlFor="image-height">Height in pixels</label><input id="image-height" type="number" min={16} max={3840} step={16} value={height} onChange={(event) => { setPreset("custom"); setHeight(Number(event.target.value)); }} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="image-variants">Variants</label><select id="image-variants" value={variants} onChange={(event) => setVariants(Number(event.target.value))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} variation{count > 1 ? "s" : ""}</option>)}</select></div>
            <div className="field"><label htmlFor="image-reference">Reference image <span className="sub">PNG, JPEG or WebP · max 10 MB</span></label><input id="image-reference" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setReference(event.target.files?.[0] || null)} /></div>
          </div>
          {brand.logoObjectKey && <div className="field"><label className="check-line"><input type="checkbox" checked={useBrandLogo} onChange={(event) => setUseBrandLogo(event.target.checked)} /> Include the saved {brand.name} logo</label>{useBrandLogo && <><label htmlFor="image-logo-placement">Logo placement</label><select id="image-logo-placement" value={logoPlacement} onChange={(event) => setLogoPlacement(event.target.value)}><option>near the lower-right edge, with clear padding</option><option>near the lower-left edge, with clear padding</option><option>small and centred near the bottom edge</option></select></>}</div>}
          <div className="field"><label className="check-line"><input type="checkbox" checked={useText} onChange={(event) => setUseText(event.target.checked)} /> Render exact text in the image</label>{useText && <><label htmlFor="image-text-content">Exact text to render</label><input id="image-text-content" value={textContent} onChange={(event) => setTextContent(event.target.value)} placeholder="Enter the exact words to render" /></>}</div>
          <div className="field"><label htmlFor="image-avoid">Visual avoid list</label><input id="image-avoid" value={avoid} onChange={(event) => setAvoid(event.target.value)} placeholder="Add any details that should stay out" /></div>
          <div className="brand-palette-preview"><span>Brand palette</span>{brand.palette.length ? brand.palette.map((color) => <i title={color} key={color} style={{ background: color }} />) : <small>Choose colours in Brand settings</small>}</div>
          <p className="image-safe-note">Keep text and logos inside the preview guide. Check wording, trademarks and visual details before publishing.</p>
          <button className="btn btn-primary" onClick={generate} disabled={busy}>{busy ? "Creating image…" : "Generate image"}</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>Saved images</h2><span className="hint">Private to this workspace · {assets.length} shown</span></div><button className="btn-quiet" onClick={() => loadHistory(brand.id)}>Refresh</button></div>
        {assets.length ? <div className="image-asset-grid">{assets.map((asset) => <article className="image-asset" key={asset.id}>
          <div className="image-asset-preview" style={{ aspectRatio: `${asset.width} / ${asset.height}` }}>
            {/* Private stream endpoint; avoid image optimization proxy so Site auth headers stay in the request. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={`${brand.name} generated visual ${asset.width} by ${asset.height}`} /><span className="safe-area-guide" />
          </div>
          <div className="image-asset-meta"><b>{asset.width} × {asset.height}</b><span>{new Date(asset.created_at).toLocaleString("en-IE")}</span><div className="btn-row"><a className="btn btn-secondary" href={asset.url} download={`${brand.id}-${asset.id}.png`}>Download PNG</a></div></div>
        </article>)}</div> : <div className="empty"><strong>No saved images yet</strong><p>Create a visual above. It will be saved to this brand&apos;s private image library.</p></div>}
      </section>
    </div>
  );
}
