import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { embed, extractLessons, saveLesson } from "@/lib/learn";
import { resolveOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (!hasDb()) {
      return NextResponse.json(
        { error: "No database connected. Approval history needs Neon in Vercel > Storage." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      brief, aiDraft, finalText, verdict, sources, approvedBy, audit,
      approverRole, campaignId, riskScore, status,
      careerStage, framework, interviewId,
    } = body;

    if (!finalText?.trim() || !approvedBy?.trim()) {
      return NextResponse.json(
        { error: "An approved piece needs text and the name of whoever signed it off." },
        { status: 400 }
      );
    }

    const key = resolveOpenAIKey(body.runtimeKey);
    const sql = db();
    const wasEdited = (aiDraft || "").trim() !== finalText.trim();

    const vec = await embed(
      `${brief.channel} ${brief.profession} ${brief.topic}\n${finalText}`,
      key
    );

    const rows = await sql`
      INSERT INTO pieces
        (channel, format, profession, topic, tone, direction,
         ai_draft, final_text, was_edited, verdict, sources, approved_by,
         approver_role, campaign_id, risk_score, status,
         career_stage, framework, interview_id)
      VALUES
        (${brief.channel}, ${brief.format}, ${brief.profession}, ${brief.topic},
         ${brief.tone || null}, ${brief.notes || null},
         ${aiDraft || finalText}, ${finalText}, ${wasEdited}, ${verdict || null},
         ${JSON.stringify(sources || [])}::jsonb, ${approvedBy},
         ${approverRole || "marketer"}, ${campaignId || null},
         ${riskScore ?? null}, ${status || "in_review"},
         ${careerStage || null}, ${framework || null}, ${interviewId || null})
      RETURNING id`;

    const pieceId = Number(rows[0].id);

    // Version 1 — the archive starts here, and rows are never updated.
    await sql`
      INSERT INTO versions (piece_id, version_no, body, action, actor, actor_role, risk_score, audit, sources)
      VALUES (${pieceId}, 1, ${finalText}, ${status || "in_review"}, ${approvedBy},
              ${approverRole || "marketer"}, ${riskScore ?? null},
              ${JSON.stringify(audit || {})}::jsonb,
              ${JSON.stringify(sources || [])}::jsonb)`;

    if (vec) {
      await sql`UPDATE pieces SET embedding = ${`[${vec.join(",")}]`}::vector WHERE id = ${pieceId}`;
    }

    // Record audit findings so recurring failures surface as patterns.
    if (audit?.compliance) {
      for (const c of audit.compliance) {
        if (c.status === "fail") {
          await sql`
            INSERT INTO findings (piece_id, channel, profession, kind, rule, detail)
            VALUES (${pieceId}, ${brief.channel}, ${brief.profession}, 'compliance', ${c.rule}, ${c.detail || null})`;
        }
      }
    }
    if (audit?.voice) {
      for (const v of audit.voice) {
        await sql`
          INSERT INTO findings (piece_id, channel, profession, kind, rule, detail)
          VALUES (${pieceId}, ${brief.channel}, ${brief.profession}, 'voice', ${v.issue}, ${v.fix || null})`;
      }
    }

    // Only an edited piece teaches anything.
    let learned: string[] = [];
    if (wasEdited) {
      const lessons = await extractLessons(aiDraft, finalText, brief, key, body.model);
      for (const l of lessons) {
        await saveLesson(pieceId, l);
        learned.push(l.lesson);
      }
    }

    return NextResponse.json({ ok: true, pieceId, wasEdited, learned });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the piece.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
