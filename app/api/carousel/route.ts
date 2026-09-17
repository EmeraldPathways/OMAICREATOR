import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildCarouselPrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";

export const runtime = "nodejs";
export const maxDuration = 90;

/** Strips anything that should never appear in an SVG we are about to render. */
function cleanSvg(svg: string): string {
  if (!svg || typeof svg !== "string") return "";
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/(href|xlink:href)\s*=\s*["']\s*javascript:[^"']*["']/gi, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const brief: CraftBrief = b.brief;
    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give the carousel a topic." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId);
    const { system, user } = buildCarouselPrompt(brief, craft, b.source);

    const out = await chatJSON<{ slides: { svg: string }[] }>({
      system, user, apiKey: key, model: b.model, temperature: 0.5,
    });
    out.slides = (out.slides || []).map((s) => ({ ...s, svg: cleanSvg(s.svg) }));

    return NextResponse.json({ carousel: out });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The carousel failed." },
      { status: 500 }
    );
  }
}
