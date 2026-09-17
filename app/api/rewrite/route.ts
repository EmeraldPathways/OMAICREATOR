import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildRewritePrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";
import { scorePlainLanguage } from "@/lib/compliance";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const text: string = b.text;
    const brief: CraftBrief = b.brief;
    if (!text?.trim()) {
      return NextResponse.json({ error: "There is nothing to rewrite." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId);
    const { system, user } = buildRewritePrompt(
      text, b.transform, brief, craft, b.instruction
    );
    const draft = await chatJSON<{ content: string }>({
      system, user, apiKey: key, model: b.model, temperature: 0.3,
    });

    // For a simplify pass, report the before and after so the claim is checkable.
    const before = scorePlainLanguage(text);
    const after = scorePlainLanguage(draft.content || "");

    return NextResponse.json({ draft, plain: { before, after } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The rewrite failed." },
      { status: 500 }
    );
  }
}
