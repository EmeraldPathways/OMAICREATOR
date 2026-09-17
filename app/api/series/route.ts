import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildSeriesArcPrompt, buildSeriesPartPrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Part {
  n: number; title: string; purpose: string; adds: string; holds_back: string; cta: string;
}

/** Step one: plan the arc. A sequence written part-by-part repeats itself. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const brief: CraftBrief = b.brief;
    const count = Math.min(Math.max(Number(b.count) || 4, 2), 7);
    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give the sequence a topic." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId);
    const { system, user } = buildSeriesArcPrompt(brief, count, craft);
    const out = await chatJSON<{ arc: string; parts: Part[] }>({
      system, user, apiKey: key, model: b.model, temperature: 0.7,
    });
    return NextResponse.json({ arc: out.arc, parts: (out.parts || []).slice(0, count) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not plan the arc." },
      { status: 500 }
    );
  }
}

/**
 * Step two: write one part, with the arc and everything already written in view.
 * One part per request so a long sequence does not hit the function timeout.
 */
export async function PUT(req: Request) {
  try {
    const b = await req.json();
    const brief: CraftBrief = b.brief;
    const part: Part = b.part;
    const previous: { n: number; title: string; body: string }[] = b.previous || [];

    if (!part?.n) {
      return NextResponse.json({ error: "Which part should it write?" }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId);
    const { system, user } = buildSeriesPartPrompt(brief, part, b.arc || "", previous, craft);
    const draft = await chatJSON<Record<string, unknown>>({
      system, user, apiKey: key, model: b.model, temperature: 0.4,
    });
    return NextResponse.json({ draft, n: part.n });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not write that part." },
      { status: 500 }
    );
  }
}
