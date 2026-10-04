"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type EmbeddedWorkspace = "rankscope" | "review-desk";

export function parseFrameHeightMessage(data: unknown, workspace: EmbeddedWorkspace): number | null {
  if (!data || typeof data !== "object") return null;
  const message = data as { type?: unknown; workspace?: unknown; height?: unknown };
  if (message.type !== "studio:frame-height" || message.workspace !== workspace) return null;
  if (typeof message.height !== "number" || !Number.isFinite(message.height)) return null;
  if (message.height < 480 || message.height > 20000) return null;
  return Math.ceil(message.height);
}

export function useEmbeddedFrameHeight(workspace: EmbeddedWorkspace): {
  frameRef: RefObject<HTMLIFrameElement | null>;
  height: number | null;
} {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    function receiveHeight(event: MessageEvent<unknown>) {
      if (event.origin !== window.location.origin) return;
      const nextHeight = parseFrameHeightMessage(event.data, workspace);
      if (nextHeight !== null) setHeight(nextHeight);
    }
    window.addEventListener("message", receiveHeight);
    return () => window.removeEventListener("message", receiveHeight);
  }, [workspace]);

  return { frameRef, height };
}
