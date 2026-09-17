/**
 * Craft layer — the things that shape what the copy actually says, as opposed
 * to the workflow around it.
 */

/* ------------------------------------------------------- career stages -- */

/**
 * Omega's video programme is already built on three career stages per
 * profession. Copy written without one is copy written for nobody: a 28-year-old
 * associate with a training loan and a 58-year-old principal planning a practice
 * sale need different services, different proof and a different tone.
 */
export interface CareerStage {
  id: string;
  name: string;
  range: string;
  general: string;
  byProfession: Record<string, string>;
}

export const CAREER_STAGES: CareerStage[] = [
  {
    id: "early",
    name: "Early career",
    range: "roughly 25–40",
    general:
      "Building, not consolidating. Income is rising but commitments are arriving faster — mortgage, young family, possibly practice debt. Protection matters more than they think and pensions feel distant. Cash flow is the constraint on every decision, so anything expensive-sounding gets dismissed before it is understood. Write to the fact that small, early decisions compound.",
    byProfession: {
      gp: "Often in a training scheme or newly on a GMS list. Income structure is unfamiliar and cover from previous employment may have lapsed. Locum work may be a significant part of income.",
      dentist: "Usually an associate rather than a principal. Training debt is common. Physical dependency of the career has not yet felt real to them, which is exactly why it needs stating plainly rather than dramatically.",
      consultant: "Recently appointed or still in higher specialist training. The public and private income split is new and often misunderstood. Contract type matters enormously and is rarely thought about.",
      pharmacist: "Employed rather than owning. May be considering the move to ownership, which changes everything about their financial picture.",
    },
  },
  {
    id: "mid",
    name: "Mid career",
    range: "roughly 40–55",
    general:
      "Peak earning, peak complexity, peak time-poverty. Multiple income sources, possibly a practice, school fees, ageing parents. They have some arrangements in place but nobody has looked at them together in years. The most common real problem is not absence of cover but drift — policies that no longer match the income they now earn. Write to consolidation and review, not to starting from scratch.",
    byProfession: {
      gp: "Likely a partner or principal with staff obligations. GMS plus private plus out-of-hours creates a genuinely complicated income picture.",
      dentist: "Often a principal with practice overheads, staff, and equipment finance. Practice value is becoming a material part of net worth without being planned for.",
      consultant: "Public and private practice both established. Pension threshold questions start to bite here. Often the point at which the two pensions have never been looked at together.",
      pharmacist: "Likely owning, with staff pension obligations and a business that is both income and asset.",
    },
  },
  {
    id: "late",
    name: "Late career",
    range: "roughly 55+",
    general:
      "Sequencing, not accumulating. The questions are about order and timing: when to draw, in what order, what happens to the practice, what the tax consequences are. Protection needs may be falling away while succession questions rise. This group has heard a lot of sales pitches and will disengage instantly from anything that sounds like one. Write to clarity and control.",
    byProfession: {
      gp: "Succession of the practice and the GMS list. Retirement timing interacts with the scheme in ways that need explaining, not assuming.",
      dentist: "Practice sale is often the single biggest financial event of their life and frequently the least planned. Physical ability to keep practising is a live constraint.",
      consultant: "Retirement from the public post while private practice may continue. Two different timelines running at once.",
      pharmacist: "Sale or succession of the pharmacy. Staff obligations continue through any transition.",
    },
  },
];

export function stageBlock(stageId: string, professionId: string): string {
  const s = CAREER_STAGES.find((x) => x.id === stageId);
  if (!s) return "";
  const specific = s.byProfession[professionId];
  return `CAREER STAGE: ${s.name} (${s.range})
${s.general}
${specific ? `\nFor this profession specifically: ${specific}` : ""}

Write to this stage. Do not hedge across all three — a piece that works for
everyone works for nobody, and Omega's whole argument is that the plan should
reflect the client's stage.`;
}

/* -------------------------------------------------------- frameworks -- */

/**
 * Without a named structure the model picks a new shape every time, so pieces
 * drift structurally even when the voice holds. A GP blog and a dentist blog
 * should be recognisably the same publication.
 */
export interface Framework {
  id: string;
  name: string;
  hint: string;
  channels: string[];
  shape: string;
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "gap",
    name: "The overlooked gap",
    hint: "Something they assume is covered, is not",
    channels: ["email", "linkedin", "website", "print", "instagram"],
    shape: `1. Name the assumption the reader holds, fairly and without condescension.
2. Show where it does not hold for their specific profession and stage.
3. Quantify the consequence qualitatively — what changes in practice, not in fear.
4. What good planning does about it.
5. One concrete next step.`,
  },
  {
    id: "mechanism",
    name: "Problem then mechanism",
    hint: "Explain how something actually works",
    channels: ["email", "linkedin", "website", "print"],
    shape: `1. The question a client actually asks.
2. Why the honest answer is more complicated than they expect.
3. The mechanism, explained in plain English, in the order it happens.
4. What it means for someone in their position.
5. Where judgement is needed and why that is the advisor's job.`,
  },
  {
    id: "arc",
    name: "Career-stage arc",
    hint: "The same issue at three stages",
    channels: ["email", "linkedin", "website", "print"],
    shape: `1. One financial issue, named plainly.
2. How it looks early career — the decision available now.
3. How it looks mid career — the drift that has usually happened.
4. How it looks late career — the constraint that has hardened.
5. The reader locates themselves, then one next step.`,
  },
  {
    id: "checklist",
    name: "Practical checklist",
    hint: "Things to check, in order",
    channels: ["email", "website", "print", "instagram"],
    shape: `1. A short framing on why this is worth twenty minutes.
2. Five to seven checks, each one a single question the reader can answer yes or no.
3. For each, one line on what a "no" actually means.
4. What to do with the answers.
5. One next step.`,
  },
  {
    id: "comparison",
    name: "Two routes compared",
    hint: "A decision with real trade-offs",
    channels: ["email", "website", "print", "linkedin"],
    shape: `1. The decision, stated neutrally.
2. Route A — what it suits, what it costs, what it forecloses.
3. Route B — the same three.
4. What genuinely determines which is right, honestly stated.
5. Why this is a conversation rather than a rule.`,
  },
  {
    id: "misconception",
    name: "What clients get wrong",
    hint: "Correct a specific belief",
    channels: ["linkedin", "instagram", "email", "website"],
    shape: `1. The belief, stated as clients actually state it.
2. Why it is reasonable to think that.
3. What is actually the case.
4. What it changes.
5. One next step.`,
  },
  {
    id: "moment",
    name: "Triggered by a moment",
    hint: "A deadline, Budget, or life event",
    channels: ["email", "linkedin", "instagram"],
    shape: `1. The moment, and why it matters now rather than generally.
2. What specifically changes for this profession.
3. What is worth doing about it, and by when.
4. What is NOT urgent, stated explicitly so the piece does not manufacture pressure.
5. One next step.`,
  },
];

export function frameworksFor(channel: string): Framework[] {
  return FRAMEWORKS.filter((f) => f.channels.includes(channel));
}

/* --------------------------------------------------------- transforms -- */

/**
 * Most real work is improvement, not creation. These are the edits Andrew
 * actually makes, named so they can be applied consistently.
 */
export interface Transform {
  id: string;
  name: string;
  hint: string;
  instruction: string;
}

export const TRANSFORMS: Transform[] = [
  {
    id: "simplify",
    name: "Simplify",
    hint: "Hit the plain language target",
    instruction: `Rewrite to satisfy the plain language obligation. Every sentence under 25 words.
Active voice. Every financial term explained on first use or removed. Target a
reading age a capable adult with no financial background handles on one pass.
Do NOT lose any caveat, limitation or disclaimer in the process — if simplifying
a sentence would drop a qualification, split it into two sentences instead.`,
  },
  {
    id: "shorten",
    name: "Cut length",
    hint: "Tighter, same substance",
    instruction: `Cut to the target length. Remove throat-clearing, restatement and any sentence
that exists to transition rather than to say something. Keep every claim, caveat
and the regulatory line. If you cannot hit the target without dropping substance,
say so in "notes" and get as close as you honestly can.`,
  },
  {
    id: "reaim",
    name: "Re-aim",
    hint: "Different profession or stage",
    instruction: `Re-aim this at the new audience. Change the examples, the income structure
described, the working details and the proof points so they are true for the new
profession and career stage. Do not simply swap the profession noun — that is
the failure mode here, and it reads as exactly what it is.`,
  },
  {
    id: "soften",
    name: "Less promotional",
    hint: "Educate more, sell less",
    instruction: `Reduce the promotional weight. Move it toward education: more explanation of the
mechanism, less assertion of Omega's value. Keep one clear next step but remove
urgency language, remove any implied scarcity, and remove sentences whose only
job is to position Omega. The reader should finish better informed whether or not
they ever contact the firm.`,
  },
  {
    id: "sharpen",
    name: "More specific",
    hint: "Less generic, more profession-grounded",
    instruction: `Make it specific. Every generic statement about "professionals" or "your income"
should become a statement about this profession's actual working life — how they
earn, what their contract does, what happens to a practice. If you do not have
the detail to be specific about something, cut the sentence rather than keeping
it vague.`,
  },
  {
    id: "warm",
    name: "Warmer",
    hint: "More human, less corporate",
    instruction: `Warm the tone without becoming sentimental or informal. Shorter sentences, more
direct address, fewer abstract nouns. The test is whether it sounds like a person
who knows this profession talking, rather than a firm issuing a communication.
Do not add exclamation marks, and do not add emojis outside Instagram.`,
  },
];

/* ---------------------------------------------- seeded style exemplars -- */

/**
 * Real approved Omega copy. A description of the voice tells the model what to
 * aim at; examples show it. These are transcribed from the Brand Guide 2026 and
 * the July–September 2026 client email programme.
 *
 * Add more through the Voice bank — the more real approved copy in here, the
 * less the output drifts.
 */
export interface Exemplar {
  id: string;
  channel: string;
  label: string;
  note: string;
  body: string;
}

export const SEED_EXEMPLARS: Exemplar[] = [
  {
    id: "seed-email-cross-sell",
    channel: "email",
    label: "Pension holders — consider Income Protection",
    note: "From the monthly client programme. Note the short paragraphs, the single CTA, and how the proof point sits mid-email rather than opening it.",
    body: `Subject: Retirement's covered. What about next year?

Your pension is in good hands with us, and that's a solid piece of the puzzle. There's another piece worth thinking about, though: what happens to your income if you couldn't work due to illness or injury.

For many business owners and professionals, this risk gets overlooked simply because retirement planning already feels sorted.

You can find out more here: Income Protection for Business Clients. Over 25 years and 2,000-plus clients, we've helped professionals across Ireland close exactly this gap.

Book 20 minutes and we'll walk through it together.

[Book a Free Financial Review]

OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.`,
  },
  {
    id: "seed-email-wealth",
    channel: "email",
    label: "Wealth Management introduction",
    note: "Opens by acknowledging what the client already has rather than what they lack. The CTA is permissive — 'if you'd like to see whether this is worth exploring' — not pushy.",
    body: `Subject: Building wealth beyond your pension

Your pension and Income Protection cover a lot of ground, but pension allowances only go so far.

Once your contributions are working as hard as they should, the next step is often building wealth outside the pension itself, structured around your business, your timeline, and your appetite for risk.

We've spent over 25 years supporting business owners and professionals across Ireland, working with more than 2,000 clients along the way.

If you'd like to see whether this is worth exploring, we're glad to talk it through.

[Book a Free Financial Review]

OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.`,
  },
  {
    id: "seed-linkedin-consultants",
    channel: "linkedin",
    label: "Pensions for Consultants",
    note: "From the Brand Guide. Title states profession and benefit. Second paragraph names the actual complexity rather than gesturing at it. Three-beat structure: complexity, what Omega does, CTA.",
    body: `Pensions for Consultants: cut through the complexity

For many consultants, pension planning is no longer straightforward. Public scheme benefits, private income, PRSA/AVC contributions, and threshold management all need to be considered together.

Omega helps consultants map every source of retirement income into one clear plan, optimise contributions where appropriate, and coordinate protection so illness does not derail long-term saving.

Schedule a free consultation at +353 1 293 8554 (Sandyford office).

OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.`,
  },
  {
    id: "seed-linkedin-dentists",
    channel: "linkedin",
    label: "Income Protection for Dentists",
    note: "The opening line names what the career physically depends on before naming the risk. Note that it states consequences plainly without catastrophising — the model of how to handle a vulnerability-adjacent topic.",
    body: `Income Protection for Dentists

Dentistry depends on precision, stamina, and physical dexterity. If illness or injury stopped you practising, your income, mortgage, practice costs, and family plans could all be affected.

Omega helps dentists review whether their current cover reflects their real income and practice position, with advice tailored to their career stage.

Schedule a free consultation at +353 1 293 8554 (Sandyford office).

OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.`,
  },
];

export function exemplarBlock(
  channel: string,
  extra: { label: string; note: string | null; body: string }[] = []
): string {
  const seeds = SEED_EXEMPLARS.filter((e) => e.channel === channel);
  const all = [
    ...seeds.map((e) => ({ label: e.label, note: e.note, body: e.body })),
    ...extra,
  ].slice(0, 4);
  if (!all.length) return "";

  return `APPROVED OMEGA COPY — match this register.
These are real published pieces, not descriptions of the voice. Read them for
rhythm, sentence length, how the CTA lands and how proof is placed. Do NOT copy
their facts, figures or phrasing — those were approved for their own moment.

${all
  .map(
    (e) =>
      `--- ${e.label} ---${e.note ? `\n(${e.note})` : ""}\n${e.body}`
  )
  .join("\n\n")}`;
}
