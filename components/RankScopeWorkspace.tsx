"use client";

import { useEffect, useState } from "react";
import type { BrandProfile } from "@/lib/brandProfiles";
import { rankScopeUrl, RANKSCOPE_VIEWS, type RankScopeView } from "@/lib/rankscope";
import ResponsiveSectionNav from "@/components/ResponsiveSectionNav";
import { useEmbeddedFrameHeight } from "@/hooks/useEmbeddedFrameHeight";

export default function RankScopeWorkspace({ profile }: { profile: BrandProfile }) {
  const [feature, setFeature] = useState<RankScopeView>("Overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const { frameRef, height } = useEmbeddedFrameHeight("rankscope");
  const src = rankScopeUrl(profile, feature);
  const websiteHost = (() => { try { return new URL(profile.websiteUrl).hostname.replace(/^www\./, ""); } catch { return "your website"; } })();

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "rankscope:navigate", view: feature }, window.location.origin);
  }, [feature, profile.id, frameRef]);

  return <section className="rankscope-workspace" aria-label={`${profile.name} RankScope workspace`}>
    <header className="rankscope-header">
      <div><span className="rankscope-eyebrow">SEARCH PERFORMANCE</span><h2>RankScope <span>· {profile.name}</span></h2><p>SEO workspace for <b>{websiteHost}</b>. Each business keeps its own workspace.</p></div>
      <div className="rankscope-actions"><button className="btn btn-secondary" onClick={() => setRefreshKey((key) => key + 1)}>Refresh</button><a className="btn btn-secondary" href={src} target="_blank" rel="noreferrer">Open in new tab ↗</a></div>
    </header>
    <ResponsiveSectionNav className="rankscope-tabs" label="RankScope features" items={RANKSCOPE_VIEWS} value={feature} onChange={setFeature} />
    <div className="rankscope-frame-wrap"><iframe key={`${profile.id}-${refreshKey}`} ref={frameRef} className={height ? "measured" : undefined} style={height ? { height: `${height}px` } : undefined} title={`${profile.name} RankScope ${feature}`} src={src} loading="lazy" onLoad={() => frameRef.current?.contentWindow?.postMessage({ type: "rankscope:navigate", view: feature }, window.location.origin)} allow="clipboard-read; clipboard-write" referrerPolicy="strict-origin-when-cross-origin" /></div>
  </section>;
}
