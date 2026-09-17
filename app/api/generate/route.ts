import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildDraftPrompt, knowledgeBlock, type Brief, type SourceDoc } from "@/lib/prompts";
import { retrieve, learnedBlock } from "@/lib/learn";
import { gatherCraft } from "@/lib/craftContext";

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
    const brief: Brief = body.brief;
    const sources: SourceDoc[] = body.sources || [];

    if (!brief?.topic?.trim()) {
      return NextResponse.json({ error: "Give the piece a topic before drafting." }, { status: 400 });
    }

    const key = resolveOpenAIKey(body.runtimeKey);

    // Pull in what the tool has learned: approved exemplars, still-valid
    // verified figures, and the corrections humans have made before.
    const learnedCtx = await retrieve(brief, key);
    const craft = await gatherCraft(brief, body.interviewId);
    const context = [craft, learnedBlock(learnedCtx), knowledgeBlock(learnedCtx.knowledge)]
      .filter(Boolean)
      .join("\n\n");
    const { system, user } = buildDraftPrompt(brief, sources, context);

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
