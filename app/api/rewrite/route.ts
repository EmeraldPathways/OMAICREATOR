import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildBrandOperationPrompt, buildRewritePrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";
import { scorePlainLanguage } from "@/lib/compliance";
import { authorizeBrandAccess } from "@/lib/brandAccess";
import { getConfiguredBrandProfile } from "@/lib/brandProfileStore";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const access = await authorizeBrandAccess(b.brandId);
    if (!access.ok) return access.response;
    const text: string = b.text;
    const brief: CraftBrief = b.brief;
    if (!text?.trim()) {
      return NextResponse.json({ error: "There is nothing to rewrite." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId, access.brandId);
    const prompt = access.brandId === "omega-financial"
      ? buildRewritePrompt(text, b.transform, brief, craft, b.instruction)
      : buildBrandOperationPrompt(
          await getConfiguredBrandProfile(access.brandId),
          "rewrite",
          "Rewrite the supplied copy while preserving its factual meaning and limitations. Return JSON only with title, content, variants, changes, claims, needs, and notes.",
          { text, transform: b.transform, instruction: b.instruction, brief },
        );
    const { system, user } = prompt;
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
