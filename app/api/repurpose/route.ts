import { NextResponse } from "next/server";
import { chatJSON, resolveOpenAIKey } from "@/lib/openai";
import { buildBrandOperationPrompt, buildRepurposePrompt } from "@/lib/prompts";
import { retrieve, learnedBlock } from "@/lib/learn";
import { db, hasDb } from "@/lib/db";
import { authorizeBrandAccess } from "@/lib/brandAccess";
import { getConfiguredBrandProfile } from "@/lib/brandProfileStore";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Adapts an already-approved piece into another channel. The whole value is
 * that the factual work is done: claims carry over with their citations, and
 * the model is barred from adding anything new.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const access = await authorizeBrandAccess(b.brandId);
    if (!access.ok) return access.response;
    const { sourceId, target } = b;

    if (!sourceId || !target?.channel || !target?.format) {
      return NextResponse.json(
        { error: "Repurposing needs an approved source piece and a target format." },
        { status: 400 }
      );
    }
    if (!hasDb()) {
      return NextResponse.json(
        { error: "Repurposing reads from the approved library, so it needs a database." },
        { status: 400 }
      );
    }

    const sql = db();
    const rows = await sql`
      SELECT id, channel, format, profession, topic, final_text, status
      FROM pieces WHERE id = ${sourceId} AND brand_id = ${access.brandId} AND retired_at IS NULL`;
    if (!rows.length) return NextResponse.json({ error: "No such piece." }, { status: 404 });

    const src = rows[0];
    if (src.status !== "approved") {
      return NextResponse.json(
        { error: "Only an approved piece can be repurposed. Otherwise you would be spreading unchecked copy." },
        { status: 400 }
      );
    }

    const key = resolveOpenAIKey(b.runtimeKey);
    const sourceBrief = {
      channel: String(src.channel),
      profession: String(src.profession),
      topic: String(src.topic),
    };

    const learnedCtx = await retrieve(
      { channel: target.channel, profession: sourceBrief.profession, topic: sourceBrief.topic },
      key,
      access.brandId,
    );

    const prompt = access.brandId === "omega-financial"
      ? buildRepurposePrompt(String(src.final_text), sourceBrief, target, [], learnedBlock(learnedCtx))
      : buildBrandOperationPrompt(await getConfiguredBrandProfile(access.brandId), "repurpose approved copy",
          "Adapt the approved source copy to the target channel and format. Preserve its meaning and do not add facts. Return JSON only with title, content, variants, claims, needs, and notes.",
          { sourceText: String(src.final_text), sourceBrief, target, learnedContext: learnedBlock(learnedCtx) });
    const { system, user } = prompt;

    const draft = await chatJSON<Record<string, unknown>>({
      system,
      user,
      apiKey: key,
      model: b.model,
      temperature: 0.3,
    });

    return NextResponse.json({ draft, source: { id: src.id, topic: src.topic } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Repurposing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
