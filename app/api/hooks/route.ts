import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildBrandOperationPrompt, buildHooksPrompt, type CraftBrief } from "@/lib/prompts";
import { gatherCraft } from "@/lib/craftContext";
import { authorizeBrandAccess } from "@/lib/brandAccess";
import { getConfiguredBrandProfile } from "@/lib/brandProfileStore";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const access = await authorizeBrandAccess(b.brandId);
    if (!access.ok) return access.response;
    const brief: CraftBrief = b.brief;
    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give it a topic first." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId, access.brandId);
    const prompt = access.brandId === "omega-financial"
      ? buildHooksPrompt(brief, craft, b.body || "")
      : buildBrandOperationPrompt(await getConfiguredBrandProfile(access.brandId), "content hooks",
          "Write exactly fifteen distinct hooks for the selected channel and audience. Return JSON only: {hooks:[{text,kind,note}]}.",
          { brief, body: b.body || "" });
    const { system, user } = prompt;
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
