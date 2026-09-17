import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildHooksPrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const brief: CraftBrief = b.brief;
    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give it a topic first." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId);
    const { system, user } = buildHooksPrompt(brief, craft, b.body || "");
    const out = await chatJSON<{ hooks: unknown[] }>({
      system, user, apiKey: key, model: b.model, temperature: 0.9,
    });
    // Capped deliberately. More options is not free: each one costs attention.
    return NextResponse.json({ hooks: (out.hooks || []).slice(0, 15) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not write hooks." },
      { status: 500 }
    );
  }
}
