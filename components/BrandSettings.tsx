"use client";

import { useState } from "react";
import type { BrandProfile, ImagePreset } from "@/lib/brandProfiles";

const lines = (items: string[]) => items.join("\n");
const list = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export default function BrandSettings({
  brand,
  onSaved,
}: {
  brand: BrandProfile;
  onSaved: (profile: BrandProfile) => void;
}) {
  const [form, setForm] = useState(brand);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true); setMessage("");
    try {
      let logoSaved = false;
      if (logo) {
        const payload = new FormData();
        payload.set("file", logo);
        const response = await fetch(`/api/brands/${brand.id}/logo`, { method: "PUT", body: payload });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Logo upload failed.");
        logoSaved = true;
      }
      const settings = {
        name: form.name, voice: form.voice, audiences: form.audiences,
        approvedFacts: form.approvedFacts, prohibitedClaims: form.prohibitedClaims,
        palette: form.palette, channels: form.channels, formats: form.formats,
        defaultImageStyle: form.defaultImageStyle, defaultLighting: form.defaultLighting,
        defaultComposition: form.defaultComposition, avoidList: form.avoidList,
        imageModel: form.imageModel, imagePresets: form.imagePresets,
        websiteUrl: form.websiteUrl, gscSiteUrl: form.gscSiteUrl, ga4PropertyId: form.ga4PropertyId,
      };
      const response = await fetch("/api/brands", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id, settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Settings could not be saved.");
      const updated = { ...data.brand, logoObjectKey: logoSaved ? "uploaded" : brand.logoObjectKey } as BrandProfile;
      onSaved(updated);
      setForm(updated);
      setLogo(null);
      setMessage("Brand settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings could not be saved.");
    } finally { setBusy(false); }
  }

  function editList(key: "audiences" | "approvedFacts" | "prohibitedClaims" | "palette" | "channels" | "formats" | "avoidList", value: string) {
    setForm((current) => ({ ...current, [key]: list(value) }));
  }

  return (
    <div className="column brand-settings">
      {message && <div className={message.includes("saved") ? "verdict ready" : "alert"} role="status">{message}</div>}
      <section className="panel">
        <div className="panel-head"><h2>{brand.name} profile</h2><span className="hint">Only this brand&apos;s content uses these settings.</span></div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="field"><label htmlFor="brand-name">Brand name</label><input id="brand-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="brand-logo">Logo <span className="sub">PNG, JPEG or WebP · up to 10 MB</span></label><input id="brand-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="brand-website">Business website</label><input id="brand-website" type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://example.ie" /></div>
            <div className="field"><label htmlFor="brand-gsc">Search Console property <span className="sub">Optional · https URL or sc-domain:…</span></label><input id="brand-gsc" value={form.gscSiteUrl} onChange={(e) => setForm({ ...form, gscSiteUrl: e.target.value })} placeholder="sc-domain:example.ie" /></div>
            <div className="field"><label htmlFor="brand-ga4">GA4 property ID <span className="sub">Optional · digits only</span></label><input id="brand-ga4" inputMode="numeric" value={form.ga4PropertyId} onChange={(e) => setForm({ ...form, ga4PropertyId: e.target.value })} placeholder="123456789" /></div>
          </div>
          <div className="field"><label htmlFor="brand-voice">Voice and tone</label><textarea id="brand-voice" rows={4} value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} placeholder="Describe how this brand should sound." /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="brand-audiences">Audiences <span className="sub">one per line</span></label><textarea id="brand-audiences" value={lines(form.audiences)} onChange={(e) => editList("audiences", e.target.value)} /></div>
            <div className="field"><label htmlFor="brand-facts">Approved facts <span className="sub">one per line</span></label><textarea id="brand-facts" value={lines(form.approvedFacts)} onChange={(e) => editList("approvedFacts", e.target.value)} placeholder="Add facts approved for this business." /></div>
          </div>
          <div className="field"><label htmlFor="brand-prohibited">Prohibited or unverified claims <span className="sub">one per line</span></label><textarea id="brand-prohibited" value={lines(form.prohibitedClaims)} onChange={(e) => editList("prohibitedClaims", e.target.value)} /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="brand-palette">Brand colours <span className="sub">hex codes, one per line</span></label><textarea id="brand-palette" value={lines(form.palette)} onChange={(e) => editList("palette", e.target.value)} placeholder="#123456" /></div>
            <div className="field"><label htmlFor="brand-channels">Preferred channels <span className="sub">one per line</span></label><textarea id="brand-channels" value={lines(form.channels)} onChange={(e) => editList("channels", e.target.value)} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="brand-formats">Content formats <span className="sub">one per line</span></label><textarea id="brand-formats" value={lines(form.formats)} onChange={(e) => editList("formats", e.target.value)} /></div>
            <div className="field"><label htmlFor="brand-avoid">Visual avoid list <span className="sub">one per line</span></label><textarea id="brand-avoid" value={lines(form.avoidList)} onChange={(e) => editList("avoidList", e.target.value)} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="brand-style">Image style</label><input id="brand-style" value={form.defaultImageStyle} onChange={(e) => setForm({ ...form, defaultImageStyle: e.target.value })} /></div>
            <div className="field"><label htmlFor="brand-lighting">Lighting</label><input id="brand-lighting" value={form.defaultLighting} onChange={(e) => setForm({ ...form, defaultLighting: e.target.value })} /></div>
            <div className="field"><label htmlFor="brand-composition">Composition</label><input id="brand-composition" value={form.defaultComposition} onChange={(e) => setForm({ ...form, defaultComposition: e.target.value })} /></div>
            <div className="field"><label htmlFor="brand-model">Image model</label><select id="brand-model" value={form.imageModel} onChange={(e) => setForm({ ...form, imageModel: e.target.value })}><option value="gpt-image-2.5-flare">Fast generation</option><option value="gpt-image-2.5-sunburst">Reference image edits</option></select></div>
          </div>
          <div className="field"><label htmlFor="brand-presets">Custom image presets <span className="sub">stored as label,width,height per line</span></label><textarea id="brand-presets" value={form.imagePresets.map((preset) => `${preset.label},${preset.width},${preset.height}`).join("\n")} onChange={(e) => {
            const presets = e.target.value.split("\n").map((row, index) => {
              const [label, width, height] = row.split(",").map((part) => part.trim());
              return { id: (label || `preset-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: label || "", width: Number(width), height: Number(height) } as ImagePreset;
            });
            setForm({ ...form, imagePresets: presets });
          }} placeholder="Square post,1024,1024" /></div>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving" : "Save brand settings"}</button>
        </div>
      </section>
    </div>
  );
}
