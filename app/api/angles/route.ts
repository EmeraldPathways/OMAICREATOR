import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildAnglesPrompt, buildBrandOperationPrompt, type CraftBrief } from "@/lib/prompts";
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
      return NextResponse.json({ error: "Give it a topic to find angles on." }, { status: 400 });
    }
    const key = resolveOpenAIKey(b.runtimeKey);
    const craft = await gatherCraft(brief, b.interviewId, access.brandId);
    const prompt = access.brandId === "omega-financial"
      ? buildAnglesPrompt(brief, craft)
      : buildBrandOperationPrompt(await getConfiguredBrandProfile(access.brandId), "content angles",
          "Propose exactly three distinct, truthful content angles. Return JSON only: {angles:[{title,pitch,why,risk}]}.", brief);
    const { system, user } = prompt;
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
