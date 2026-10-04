"use client";

import { useState } from "react";
import type { BrandId } from "@/lib/brandProfiles";
import { reviewDeskUiUrl } from "@/lib/reviewDesk/embed";
import { useEmbeddedFrameHeight } from "@/hooks/useEmbeddedFrameHeight";

interface Props {
  brandId: BrandId;
  brandName: string;
  connected?: boolean;
}

export default function ReviewDeskFrame({ brandId, brandName, connected = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const { frameRef, height } = useEmbeddedFrameHeight("review-desk");
  return (
    <section className="review-desk-workspace" aria-label={`${brandName} Review Desk`}>
      {connected && (
        <div className="review-desk-connected" role="status">
          Google Business Profile connected for {brandName}. Select your locations in Connections to start syncing reviews.
        </div>
      )}
      <div className="review-desk-frame-wrap">
        {!loaded && <div className="review-desk-loading" role="status"><span className="spinner" /> Loading Review Desk…</div>}
        <iframe
          key={brandId}
          ref={frameRef}
          className={height ? "measured" : undefined}
          style={height ? { height: `${height}px` } : undefined}
          src={reviewDeskUiUrl(brandId)}
          title={`Review Desk for ${brandName}`}
          onLoad={() => setLoaded(true)}
          loading="eager"
        />
      </div>
    </section>
  );
}
