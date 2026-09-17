import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildAuditPrompt, type Brief, type SourceDoc } from "@/lib/prompts";
import { scorePlainLanguage, vulnerabilityTouch, riskScore } from "@/lib/compliance";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Audit {
  verdict: "ready" | "revise" | "block";
  summary: string;
  claims: { text: string; status: string; basis: string; comment: string }[];
  compliance: { rule: string; status: string; detail: string; span?: string }[];
  voice: { issue: string; span?: string; fix: string }[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content: string = body.content;
    const brief: Brief = body.brief;
    const sources: SourceDoc[] = body.sources || [];

    if (!content?.trim()) {
      return NextResponse.json({ error: "There is nothing to audit yet." }, { status: 400 });
    }

    const key = resolveOpenAIKey(body.runtimeKey);
    const { system, user } = buildAuditPrompt(content, brief, sources);
    // Temperature 0 — the audit should be repeatable, not creative.
    const audit = await chatJSON<Audit>({ system, user, apiKey: key, model: body.model, temperature: 0 });

    // Computed in code, not asked of the model.
    const plain = scorePlainLanguage(content);
    const vulnerable = vulnerabilityTouch(content);
    const risk = riskScore({
      compliance: audit.compliance,
      claims: audit.claims,
      plain,
    });

    return NextResponse.json({ audit, plain, vulnerable, risk });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
