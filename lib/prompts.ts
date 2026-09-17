import { VOICE, COMPLIANCE, CHANNELS, PROFESSIONS } from "./brand";
import { factsForPrompt } from "./facts";
import { codeRulesForPrompt, VULNERABILITY_TRIGGERS } from "./compliance";

export interface SourceDoc {
  n: number;
  title: string;
  url: string;
  snippet: string;
  published?: string;
}

export interface Brief {
  channel: string;
  format: string;
  profession: string;
  topic: string;
  tone: string;
  notes?: string;
  wordTarget?: string;
}

function sourceBlock(sources: SourceDoc[]): string {
  if (!sources.length) {
    return `LIVE SOURCES: none attached.
You therefore have NO permission to state any external figure, rate, threshold,
date or statistic. Write the piece around that gap and list what needs sourcing
in your "needs" array.`;
  }
  return `LIVE SOURCES — these were retrieved today. They are the only external
evidence you may use. Cite them as [S1], [S2] and so on, inline, at the exact point
of the claim:

${sources
  .map(
    (s) =>
      `[S${s.n}] ${s.title}\n     ${s.url}${
        s.published ? `\n     Published: ${s.published}` : ""
      }\n     ${s.snippet}`
  )
  .join("\n\n")}`;
}

export function buildDraftPrompt(
  brief: Brief,
  sources: SourceDoc[],
  learned = ""
) {
  const channel = CHANNELS.find((c) => c.id === brief.channel);
  const format = channel?.formats.find((f) => f.id === brief.format);
  const profession = PROFESSIONS.find((p) => p.id === brief.profession);

  const system = `You are the content lead at Omega Financial Management, an Irish
financial planning firm regulated by the Central Bank of Ireland. You write for
medical professionals. Your work is read by a compliance reviewer before it ships,
so an honest gap is always better than a confident guess.

THE ONE RULE THAT OVERRIDES EVERYTHING ELSE
Every factual assertion in your output must trace to either the approved fact base
below or an attached live source. If it traces to neither, you have three options,
in order of preference: rewrite the sentence so the claim is not needed; state the
point qualitatively without the number; or write the number as a bracketed
placeholder like [VERIFY: current State Illness Benefit rate] and list it in "needs".
You must never produce an unmarked figure from memory. Rates, thresholds, limits and
statistics in your training data are out of date and stating them is the single most
damaging thing you can do here.

${factsForPrompt()}

${VOICE}

${codeRulesForPrompt()}

${COMPLIANCE}

PLAIN LANGUAGE — this is a Code obligation, not a style preference.
Keep sentences under 25 words. Use the active voice. Explain any financial term
on first use. Aim for something a reader with no financial background follows on
one pass. The draft is scored for this automatically after you write it.

VULNERABLE CIRCUMSTANCES — if the piece touches illness, injury, disability,
bereavement, career loss or retirement (and income protection copy always does),
write to inform, never to frighten. No pressure, no catastrophising, no implied
urgency. A consumer may be in vulnerable circumstances temporarily or permanently.

CHANNEL SPECIFICATION
${channel?.spec ?? ""}

FORMAT: ${format?.name ?? brief.format} — ${format?.hint ?? ""}

AUDIENCE: ${profession?.name ?? brief.profession}
${profession?.note ?? ""}

OUTPUT FORMAT
Return a single JSON object and nothing else. No markdown fences.
{
  "title": "short internal label for this piece",
  "content": "the full piece, ready to paste, with inline [S1] citations and any [VERIFY: ...] placeholders",
  "variants": ["alternative subject lines / headlines / hooks, 3 of them, best first"],
  "claims": [
    {
      "text": "the exact assertion as it appears in the content",
      "basis": "FACT:<fact-id> or S1..Sn or UNVERIFIED",
      "quote": "the words from the fact base or source that support it, or empty"
    }
  ],
  "needs": ["anything you could not verify and what would resolve it"],
  "compliance": {
    "disclaimer": "the disclaimer text you included",
    "regulatoryLine": "the regulatory line you included"
  },
  "notes": "anything the reviewer should know before this ships"
}

List EVERY assertion in "claims" — including ones based on the fact base. A claim is
anything a reader could challenge as true or false. Pure opinion, questions and
calls to action are not claims.`;

  const user = `Write a ${format?.name ?? brief.format} for ${channel?.name}.

Audience: ${profession?.name ?? brief.profession}
Topic: ${brief.topic}
Tone: ${brief.tone}
${brief.wordTarget ? `Word target: ${brief.wordTarget}` : ""}
${brief.notes ? `\nAdditional direction from the marketer:\n${brief.notes}` : ""}

${sourceBlock(sources)}${learned ? `\n\n${learned}` : ""}`;

  return { system, user };
}

export function buildAuditPrompt(
  content: string,
  brief: Brief,
  sources: SourceDoc[]
) {
  const system = `You are an independent compliance and fact reviewer for an Irish
financial advisory firm regulated by the Central Bank of Ireland. You did not write
the copy in front of you and you have no stake in it shipping. Your job is to find
what is wrong with it.

Be adversarial. Assume the writer was careless. A claim is "verified" ONLY if you can
point to the exact fact-base entry or source line that supports it. "It sounds right"
is not verification. "It is widely known" is not verification. If a number appears
without a citation, it is unverified, full stop.

${factsForPrompt()}

${codeRulesForPrompt()}

${COMPLIANCE}

${VOICE}

Return a single JSON object and nothing else. No markdown fences.
{
  "verdict": "ready" | "revise" | "block",
  "summary": "two sentences on the state of this draft",
  "claims": [
    {
      "text": "the assertion, quoted from the draft",
      "status": "verified" | "unverified" | "contradicted",
      "basis": "FACT:<id>, S1..Sn, or none",
      "comment": "why, and what would fix it"
    }
  ],
  "compliance": [
    {
      "rule": "the rule name, EXACTLY as written in the Code rules above",
      "status": "pass" | "fail",
      "detail": "what you found",
      "span": "the exact offending words copied verbatim from the draft, or empty if it passed"
    }
  ],
  "voice": [
    { "issue": "what breaks brand voice or style", "span": "the exact words from the draft", "fix": "the replacement wording" }
  ]
}

Report EVERY rule from the Code list above by its exact name, pass or fail.
Do not skip a rule because it seems irrelevant — say it passed.

"span" is used to highlight the problem in the editor, so it must be copied
character for character from the draft. If you cannot quote it exactly, leave
span empty rather than paraphrasing.

Verdict is "block" if any critical rule fails or any claim is contradicted.
Verdict is "revise" if a high or medium rule fails or any claim is unverified.
Only "ready" if everything passes.`;

  const user = `Draft to review — channel: ${brief.channel}, audience: ${brief.profession}, topic: ${brief.topic}

--- BEGIN DRAFT ---
${content}
--- END DRAFT ---

${sourceBlock(sources)}`;

  return { system, user };
}


/* ------------------------------------------------ profession knowledge -- */

export function knowledgeBlock(
  entries: { id: number; topic: string; body: string; source_url: string | null }[]
): string {
  if (!entries.length) return "";
  return `WHAT WE KNOW ABOUT THIS PROFESSION'S WORKING LIFE
Curated by the Omega team. Use it to make the copy specific rather than generic
— this is the difference between Omega and a generalist advisor. Treat it as
background for framing, not as a source for figures: anything numeric still
needs a live source or a verified figure.
${entries
  .map((e) => `- [K${e.id}] ${e.topic}: ${e.body}${e.source_url ? ` (${e.source_url})` : ""}`)
  .join("\n")}`;
}

/* ---------------------------------------------------------- repurposing -- */

export function buildRepurposePrompt(
  sourceText: string,
  sourceBrief: { channel: string; profession: string; topic: string },
  target: { channel: string; format: string },
  claims: { text: string; basis: string }[],
  learned = ""
) {
  const channel = CHANNELS.find((c) => c.id === target.channel);
  const format = channel?.formats.find((f) => f.id === target.format);

  const system = `You are adapting a piece of Omega Financial Management content
that has already been through compliance review and human approval, into a
different channel.

THE POINT OF THIS TASK is that the factual work is already done. The approved
piece's claims were verified. Your job is to re-cut them for a different format
and reading context — NOT to add anything new.

HARD CONSTRAINTS
- You may only use facts that appear in the approved source text below. Adding a
  figure, statistic or claim that is not in it defeats the entire purpose and
  puts unverified content into circulation under the cover of an approved piece.
- Every claim you carry over keeps its citation marker exactly as written.
- If the target format needs something the source does not contain, leave a
  [VERIFY: ...] placeholder and list it in "needs". Do not fill the gap yourself.
- You may cut, reorder, compress and rewrite for the channel. You may not invent.
- Re-apply the disclaimer and the regulatory line for the new format.

${codeRulesForPrompt()}

${VOICE}

TARGET CHANNEL SPECIFICATION
${channel?.spec ?? ""}

TARGET FORMAT: ${format?.name ?? target.format} — ${format?.hint ?? ""}

${learned}

Return a single JSON object and nothing else:
{
  "title": "internal label",
  "content": "the adapted piece",
  "variants": ["3 alternative hooks or subject lines"],
  "claims": [{ "text": "", "basis": "carried from source, or FACT:<id>, or S1..Sn", "quote": "" }],
  "needs": ["anything the target format wanted that the source did not provide"],
  "dropped": ["material from the source you had to cut, so a reviewer can check nothing essential was lost"],
  "compliance": { "disclaimer": "", "regulatoryLine": "" },
  "notes": ""
}`;

  const user = `Approved source — ${sourceBrief.channel}, ${sourceBrief.profession}, "${sourceBrief.topic}"

--- BEGIN APPROVED PIECE ---
${sourceText}
--- END APPROVED PIECE ---

Claims already verified in that piece:
${claims.length ? claims.map((c) => `- ${c.text} [${c.basis}]`).join("\n") : "(none recorded)"}

Adapt it into: ${format?.name ?? target.format} for ${channel?.name ?? target.channel}.`;

  return { system, user };
}

export const VULNERABILITY_LIST = VULNERABILITY_TRIGGERS;

/* ================================================================ CRAFT == */

import {
  stageBlock, frameworksFor, FRAMEWORKS, TRANSFORMS,
  exemplarBlock, CAREER_STAGES,
} from "./craft";

export interface CraftBrief extends Brief {
  stage?: string;
  framework?: string;
  angle?: string;
}

export function questionBlock(
  qs: { id: number; text: string; context: string | null; kind: string }[]
): string {
  if (!qs.length) return "";
  return `WHAT ADVISORS ACTUALLY GET ASKED
Recorded by the Omega team from real client conversations. Content that answers
a real question outperforms content built on a topic someone chose in a planning
meeting. Use these to ground the piece; you do not have to address all of them.
${qs.map((q) => `- [${q.kind}] ${q.text}${q.context ? ` — ${q.context}` : ""}`).join("\n")}`;
}

/** The craft layers, assembled once so every generator gets the same grounding. */
export function craftBlock(
  brief: CraftBrief,
  opts: {
    exemplars?: { label: string; note: string | null; body: string }[];
    questions?: { id: number; text: string; context: string | null; kind: string }[];
    interview?: { q: string; a: string }[];
  } = {}
): string {
  const parts: string[] = [];

  if (brief.stage) parts.push(stageBlock(brief.stage, brief.profession));

  if (brief.framework) {
    const f = FRAMEWORKS.find((x) => x.id === brief.framework);
    if (f) {
      parts.push(`STRUCTURE — follow this shape. It is what makes an Omega piece
recognisably an Omega piece rather than a generic article.

${f.name}: ${f.hint}
${f.shape}`);
    }
  }

  if (brief.angle) {
    parts.push(`THE ANGLE — this was chosen deliberately. Write to it and do not
drift back to a general treatment of the topic:
${brief.angle}`);
  }

  if (opts.interview?.length) {
    parts.push(`ADVISOR INTERVIEW — the most valuable input you have.
This is what an actual Omega advisor said about this topic. Their specifics beat
anything you would otherwise generate: use their examples, their framing and the
things they say clients get wrong. Where they gave a detail you would not have
known, use it. Where they contradict your instinct, they are right.

${opts.interview.map((t) => `Q: ${t.q}\nA: ${t.a}`).join("\n\n")}

Do not quote the advisor as a named source in the copy, and do not turn anything
they said into a client testimonial.`);
  }

  const ex = exemplarBlock(brief.channel, opts.exemplars || []);
  if (ex) parts.push(ex);

  const qb = questionBlock(opts.questions || []);
  if (qb) parts.push(qb);

  return parts.join("\n\n");
}

/* ---------------------------------------------------------------- angles */

export function buildAnglesPrompt(brief: CraftBrief, craft: string) {
  const prof = PROFESSIONS.find((p) => p.id === brief.profession);
  const stage = CAREER_STAGES.find((s) => s.id === brief.stage);
  const system = `You are a content strategist at Omega Financial Management,
an Irish financial planning firm regulated by the Central Bank of Ireland,
writing for medical professionals.

Before anything is drafted, propose three genuinely DIFFERENT angles on the topic.
Different angles, not three phrasings of the same one. If two of your three could
be merged without losing anything, you have not done the job.

An angle is a specific claim or tension worth building a piece around — not a
subject area. "Pensions for GPs" is a topic. "Most GPs are told to maximise
contributions; for a partner with practice debt that is often the wrong order of
operations" is an angle.

Each angle must be true and defensible. Do not invent a tension to be interesting.
Do not use any external figure, rate or statistic — you have no source for one.

${VOICE}

${codeRulesForPrompt()}

${craft}

Return JSON only:
{
 "angles":[
   {"title":"six words or fewer",
    "pitch":"two or three sentences making the case for this piece",
    "why":"why this lands with this profession at this career stage",
    "risk":"the honest weakness of this angle — what makes it harder to pull off"}
 ]
}
Exactly three. Include "risk" honestly; an angle with no stated weakness reads as
though you did not think about it.`;

  const user = `Topic: ${brief.topic}
Audience: ${prof?.name}${stage ? ` — ${stage.name} (${stage.range})` : ""}
Channel: ${CHANNELS.find((c) => c.id === brief.channel)?.name}
${brief.notes ? `\nDirection: ${brief.notes}` : ""}`;

  return { system, user };
}

/* ----------------------------------------------------------------- hooks */

export function buildHooksPrompt(brief: CraftBrief, craft: string, body: string) {
  const prof = PROFESSIONS.find((p) => p.id === brief.profession);
  const isSocial = brief.channel === "linkedin" || brief.channel === "instagram";

  const system = `You write openers for Omega Financial Management, an Irish
financial planning firm regulated by the Central Bank of Ireland.

${isSocial
  ? "On LinkedIn and Instagram the first two lines decide whether anything else gets read. Everything below the fold is wasted if the opener fails."
  : "The subject line and opening line decide whether the rest is read."}

Produce fifteen. They must differ in KIND, not just wording — a question, a flat
statement of fact, a specific scenario, a correction of a common belief, a
consequence, a comparison. If five of yours are the same move with different
nouns, you have failed.

HARD RULES
- Never open with the word "I".
- No fear-mongering, no manufactured urgency, no clickbait withholding.
- No figure, rate or statistic — you have no source for one.
- No superlatives about Omega.
- This profession named or clearly implied in most of them.
- British spelling. Sentence case.

${VOICE}

Return JSON only:
{"hooks":[{"text":"the opener","kind":"question|statement|scenario|correction|consequence|comparison","note":"one short line on who this lands with"}]}
Exactly fifteen.`;

  const user = `Profession: ${prof?.name}
Topic: ${brief.topic}
Channel: ${CHANNELS.find((c) => c.id === brief.channel)?.name}
${body ? `\nThe piece these open:\n${body.slice(0, 2500)}` : ""}
${craft ? `\n${craft}` : ""}`;

  return { system, user };
}

/* --------------------------------------------------------------- rewrite */

export function buildRewritePrompt(
  text: string,
  transformId: string,
  brief: CraftBrief,
  craft: string,
  instruction?: string
) {
  const t = TRANSFORMS.find((x) => x.id === transformId);

  const system = `You are editing existing Omega Financial Management copy. This
is a rewrite, not a new piece: the substance stays, the execution changes.

THE TRANSFORM
${t ? `${t.name} — ${t.hint}\n\n${t.instruction}` : instruction || "Improve the copy."}
${t && instruction ? `\n\nAdditional direction from the marketer: ${instruction}` : ""}

WHAT YOU MAY NOT DO, whatever the transform asks
- Do not add any factual claim that is not already in the text.
- Do not add a figure, rate or statistic. You have no source.
- Do not remove a disclaimer, a caveat, a limitation or the regulatory line.
- Do not strengthen a hedged statement into a confident one.
If the transform and these rules conflict, these rules win and you say so in "notes".

${factsForPrompt()}

${codeRulesForPrompt()}

${VOICE}

${craft}

Return JSON only:
{
 "title":"internal label",
 "content":"the rewritten piece",
 "variants":["three alternative headlines or subject lines"],
 "changes":["what you changed and why, one line each, at most six"],
 "claims":[{"text":"","basis":"carried from source, or FACT:<id>, or UNVERIFIED","quote":""}],
 "needs":["anything unverifiable that was already in the text"],
 "notes":"anything the reviewer should know, including any conflict you hit"
}`;

  const user = `Channel: ${brief.channel} · Audience: ${brief.profession}${brief.stage ? ` · ${brief.stage} career` : ""}
${brief.wordTarget ? `Target length: ${brief.wordTarget} words` : ""}

--- TEXT TO REWRITE ---
${text}
--- END ---`;

  return { system, user };
}

/* ---------------------------------------------------------------- series */

export function buildSeriesArcPrompt(brief: CraftBrief, count: number, craft: string) {
  const prof = PROFESSIONS.find((p) => p.id === brief.profession);

  const system = `You are planning a ${count}-part sequence for Omega Financial
Management, an Irish financial planning firm regulated by the Central Bank of Ireland.

A sequence written one piece at a time repeats itself, because each piece
reintroduces the subject and restates the same case. Plan the arc FIRST: decide
what each part adds that the previous one did not, and what it deliberately
leaves for later.

Each part needs a reason to exist. If part four could be deleted without the
reader losing anything, the arc is wrong — fix it rather than padding it.

Escalation of commitment across the sequence: early parts educate and ask for
nothing, later parts may ask. Never open a sequence with the strongest ask.

${VOICE}

${craft}

Return JSON only:
{
 "arc":"two sentences describing the journey from part 1 to part ${count}",
 "parts":[
   {"n":1,"title":"","purpose":"what this part is FOR","adds":"what it introduces that nothing before it did",
    "holds_back":"what it deliberately leaves for later","cta":"the ask, or 'none'"}
 ]
}
Exactly ${count} parts.`;

  const user = `Sequence topic: ${brief.topic}
Audience: ${prof?.name}${brief.stage ? `, ${brief.stage} career` : ""}
Channel: ${CHANNELS.find((c) => c.id === brief.channel)?.name}
${brief.notes ? `\nDirection: ${brief.notes}` : ""}`;

  return { system, user };
}

export function buildSeriesPartPrompt(
  brief: CraftBrief,
  part: { n: number; title: string; purpose: string; adds: string; holds_back: string; cta: string },
  arc: string,
  previous: { n: number; title: string; body: string }[],
  craft: string
) {
  const { system: base } = buildDraftPrompt(brief, [], craft);

  const system = `${base}

YOU ARE WRITING PART ${part.n} OF A SEQUENCE.

The arc: ${arc}

This part's job: ${part.purpose}
What it must add: ${part.adds}
What it must hold back for later: ${part.holds_back}
Its ask: ${part.cta}

${previous.length
    ? `PARTS ALREADY WRITTEN — do not restate their openings, their framing or their
examples. The reader has read these. Reference them lightly if useful, but assume
they landed.\n\n${previous.map((p) => `--- Part ${p.n}: ${p.title} ---\n${p.body.slice(0, 1200)}`).join("\n\n")}`
    : "This is the first part. Set up the subject without exhausting it."}`;

  const user = `Write part ${part.n}: ${part.title}

Sequence topic: ${brief.topic}
Audience: ${brief.profession}${brief.stage ? `, ${brief.stage} career` : ""}`;

  return { system, user };
}

/* -------------------------------------------------------------- carousel */

export function buildCarouselPrompt(brief: CraftBrief, craft: string, source?: string) {
  const prof = PROFESSIONS.find((p) => p.id === brief.profession);

  const system = `You design Instagram carousels for Omega Financial Management,
an Irish financial planning firm regulated by the Central Bank of Ireland.

You return both the copy AND the artwork. The artwork is SVG, in the Omega brand
palette, ready to export — not a description of a slide.

BRAND PALETTE — use these exact values
Crimson #661e24 · Gold #988b54 · Cream #e1dece · White #ffffff · Ink #231c1d

SLIDE RULES
- 1080 x 1080. viewBox="0 0 1080 1080".
- Slide 1 is a Crimson cover. Hook of six words or fewer, in Cream, large.
- Slides 2 to 6 are Cream. One idea each, under 25 words, in Ink, with a short
  Crimson heading. A Gold rule under the heading.
- Final slide is Crimson with the CTA and the phone number in Cream.
- Font: font-family="Poppins, Helvetica, Arial, sans-serif". Poppins may not be
  present when rendered, so the fallbacks matter and text must not depend on
  exact metrics — never rely on textLength, and keep lines short.
- Wrap text yourself using separate <text> elements per line, with explicit y
  values. SVG does not wrap. A single long <text> will run off the slide.
- Generous margins: nothing within 90px of any edge.
- No gradients, no shadows, no stock-looking decoration. Flat, confident, plain.
- Every slide carries a small Gold "omegafinancial.ie" at the foot except slide 1.

${factsForPrompt()}

${codeRulesForPrompt()}

${VOICE}

${craft}

Return JSON only:
{
 "slides":[{"n":1,"role":"cover|content|cta","copy":"the words on this slide","alt":"alt text for accessibility","svg":"<svg viewBox=\\"0 0 1080 1080\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"}],
 "caption":"the Instagram caption, including the regulatory line",
 "hashtags":["five to eight, profession-specific"],
 "claims":[{"text":"","basis":"FACT:<id> or UNVERIFIED","quote":""}],
 "needs":[],
 "notes":""
}
Six or seven slides. The SVG must be valid and self-contained — no external
images, no <style> blocks, no JavaScript. Use only rect, text, line and path.`;

  const user = `Carousel topic: ${brief.topic}
Audience: ${prof?.name}${brief.stage ? `, ${brief.stage} career` : ""}
${brief.notes ? `Direction: ${brief.notes}` : ""}
${source ? `\nBase it on this approved piece — do not add facts it does not contain:\n${source.slice(0, 3000)}` : ""}`;

  return { system, user };
}

/* ------------------------------------------------------------- interview */

export function buildInterviewQuestionsPrompt(brief: CraftBrief, craft: string) {
  const prof = PROFESSIONS.find((p) => p.id === brief.profession);

  const system = `You are interviewing an Omega Financial Management advisor to
extract what they know that a language model does not.

This is the whole point: Omega's advantage over a generalist firm is profession
specificity, and that specificity lives in the advisor's head. Your questions
should pull out things you could not otherwise generate — the objection they hear
most, the thing clients consistently get wrong, the case that changed how they
explain something, the detail about this profession's working life that outsiders
miss.

BAD QUESTIONS are ones you could answer yourself: "why is income protection
important for dentists?" You already know the general answer. Ask instead: "what
do dentists say when you raise income protection, and what do you say back?"

Ask about SPECIFICS: what they say, what clients say, what surprised them, what
they got wrong early in their career, what they wish clients knew sooner.

Eight questions. Short enough to answer out loud in a minute or two each. Ordered
so the easy ones come first and the advisor warms up.

${craft}

Return JSON only:
{"questions":[{"n":1,"q":"the question","why":"one line on what this is trying to surface"}]}
Exactly eight.`;

  const user = `Advisor is being interviewed about: ${brief.topic}
For: ${prof?.name}${brief.stage ? `, ${brief.stage} career clients` : ""}`;

  return { system, user };
}
