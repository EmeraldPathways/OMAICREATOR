"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandProfile } from "@/lib/brandProfiles";
import { rankScopeUrl, RANKSCOPE_VIEWS, type RankScopeView } from "@/lib/rankscope";

export default function RankScopeWorkspace({ profile }: { profile: BrandProfile }) {
  const [feature, setFeature] = useState<RankScopeView>("Overview");
  const frame = useRef<HTMLIFrameElement>(null);
  const src = rankScopeUrl(profile, feature);
  const websiteHost = (() => { try { return new URL(profile.websiteUrl).hostname.replace(/^www\./, ""); } catch { return "your website"; } })();

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "rankscope:navigate", view: feature }, window.location.origin);
  }, [feature, profile.id]);

  return <section className="rankscope-workspace" aria-label={`${profile.name} RankScope workspace`}>
    <header className="rankscope-header">
      <div><span className="rankscope-eyebrow">SEARCH PERFORMANCE</span><h2>RankScope <span>· {profile.name}</span></h2><p>SEO workspace for <b>{websiteHost}</b>. Each business keeps its own workspace.</p></div>
      <div className="rankscope-actions"><button className="btn btn-secondary" onClick={() => { if (frame.current) frame.current.src = src; }}>Refresh</button><a className="btn btn-secondary" href={src} target="_blank" rel="noreferrer">Open in new tab ↗</a></div>
    </header>
    <nav className="rankscope-tabs" aria-label="RankScope features">
      {RANKSCOPE_VIEWS.map((item) => <button key={item} type="button" className={feature === item ? "active" : ""} aria-current={feature === item ? "page" : undefined} onClick={() => setFeature(item)}>{item}</button>)}
    </nav>
    <div className="rankscope-frame-wrap"><iframe key={profile.id} ref={frame} title={`${profile.name} RankScope ${feature}`} src={src} loading="lazy" onLoad={() => frame.current?.contentWindow?.postMessage({ type: "rankscope:navigate", view: feature }, window.location.origin)} allow="clipboard-read; clipboard-write" referrerPolicy="strict-origin-when-cross-origin" /></div>
  </section>;
}
