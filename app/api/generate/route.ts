import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildBrandDraftPrompt, buildDraftPrompt, knowledgeBlock, type Brief, type SourceDoc } from "@/lib/prompts";
import { retrieve, learnedBlock } from "@/lib/learn";
import { gatherCraft } from "@/lib/craftContext";
import { authorizeBrandAccess } from "@/lib/brandAccess";
import { getConfiguredBrandProfile } from "@/lib/brandProfileStore";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Draft {
  title: string;
  content: string;
  variants: string[];
  claims: { text: string; basis: string; quote: string }[];
  needs: string[];
  compliance: { disclaimer: string; regulatoryLine: string };
  notes: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await authorizeBrandAccess(body.brandId);
    if (!access.ok) return access.response;
    const brief: Brief = body.brief;
    const sources: SourceDoc[] = body.sources || [];

    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give the piece a topic before drafting." }, { status: 400 });
    }

    const key = resolveOpenAIKey(body.runtimeKey);

    // Pull in what the tool has learned: approved exemplars, still-valid
    // verified figures, and the corrections humans have made before.
    let profile = access.brandId === "omega-financial" ? undefined : await getConfiguredBrandProfile(access.brandId);
    const learnedCtx = await retrieve(brief, key, access.brandId);
    if (profile) profile = { ...profile, approvedFacts: [...profile.approvedFacts, ...learnedCtx.brandFacts.filter((fact) => fact.status === "verified").map((fact) => `${fact.fact_key}: ${fact.label} — ${fact.value}`)] };
    const craft = await gatherCraft(brief, body.interviewId, access.brandId);
    const referenceNotes = learnedCtx.knowledge.length
      ? `REFERENCE NOTES FOR ${profile?.name || "Omega Financial"} — framing only, not evidence for factual claims:\n${learnedCtx.knowledge.map((entry) => `- ${entry.topic}: ${entry.body}${entry.source_url ? ` (${entry.source_url})` : ""}`).join("\n")}`
      : "";
    const knowledge = access.brandId === "omega-financial" ? knowledgeBlock(learnedCtx.knowledge) : referenceNotes;
    const context = [craft, learnedBlock(learnedCtx), knowledge]
      .filter(Boolean)
      .join("\n\n");
    const prompt = access.brandId === "omega-financial"
      ? buildDraftPrompt(brief, sources, context)
      : buildBrandDraftPrompt(access.brandId, brief, sources, context, profile);
    const { system, user } = prompt;

    const draft = await chatJSON<Draft>({ system, user, apiKey: key, model: body.model, temperature: 0.4 });

    return NextResponse.json({
      draft,
      learned: {
        mode: learnedCtx.mode,
        exemplars: learnedCtx.exemplars.length,
        facts: learnedCtx.facts.length,
        lessons: learnedCtx.lessons.length,
        knowledge: learnedCtx.knowledge.length,
        expired: learnedCtx.expiredFacts.map((f) => ({
          id: f.id,
          claim: f.claim,
          value: f.value,
          expires_at: f.expires_at,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Drafting failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
