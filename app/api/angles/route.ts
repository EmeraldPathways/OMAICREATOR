import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildAnglesPrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const brief: CraftBrief = b.brief;
    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give it a topic to find angles on." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId);
    const { system, user } = buildAnglesPrompt(brief, craft);
    const out = await chatJSON<{ angles: unknown[] }>({
      system, user, apiKey: key, model: b.model, temperature: 0.8,
    });
    return NextResponse.json({ angles: (out.angles || []).slice(0, 3) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not find angles." },
      { status: 500 }
    );
  }
}
