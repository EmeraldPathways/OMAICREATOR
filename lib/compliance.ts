/**
 * COMPLIANCE — Central Bank of Ireland
 * ---------------------------------------------------------------------------
 * The revised Consumer Protection Code applies from 24 March 2026, alongside
 * the Standards for Business Regulations. The Standards are ABSOLUTE
 * requirements: a firm found in breach cannot defend itself on the grounds
 * that it took reasonable measures. That is why this file exists separately
 * from the brand guide, and why the record of what was checked matters as much
 * as the check itself.
 *
 * This is not legal advice and it is not a substitute for compliance review.
 * It is a first-pass filter designed to catch the obvious before a person looks.
 */

export interface CodeRule {
  id: string;
  name: string;
  source: string;
  test: string;
  severity: "critical" | "high" | "medium";
}

export const CODE_RULES: CodeRule[] = [
  {
    id: "regulatory-line",
    name: "Mandatory regulatory line",
    source: "Firm authorisation disclosure",
    test: "The asset carries: OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.",
    severity: "critical",
  },
  {
    id: "disclaimer",
    name: "Disclaimer present and matched to subject",
    source: "Advertising guidance",
    test: "The disclaimer matches the subject matter — investment, pension, income protection or tax — rather than a generic one.",
    severity: "critical",
  },
  {
    id: "no-guarantees",
    name: "No guaranteed outcomes",
    source: "Advertising guidance; fair and not misleading",
    test: "No promise of returns, claims success, pension outcomes or absolute protection unless a specific provider guarantee exists and is explained.",
    severity: "critical",
  },
  {
    id: "no-superiority",
    name: "No unsubstantiated superiority",
    source: "Advertising guidance; fair and not misleading",
    test: 'No "best", "number one", "leading", "top" or equivalent without substantiation.',
    severity: "critical",
  },
  {
    id: "advice-vs-info",
    name: "Advice versus information distinguished",
    source: "Informing effectively",
    test: "Educational content states plainly that it is general information and not personalised financial advice.",
    severity: "high",
  },
  {
    id: "regulated-vs-unregulated",
    name: "Regulated and unregulated activity distinguished",
    source: "Standards for Business, 2026 Code",
    test:
      "Where the copy touches anything outside the firm's regulated permissions, the reader cannot be left with the impression that it carries the protections of a regulated service. New in the 2026 Code.",
    severity: "critical",
  },
  {
    id: "plain-language",
    name: "Plain language",
    source: "2026 Code; guidance references ISO Plain Language Standards and NALA",
    test:
      "Sentences are short, the voice is active, and financial terms are explained on first use. Scored separately below.",
    severity: "high",
  },
  {
    id: "informing-effectively",
    name: "Informing effectively",
    source: "Standards for Business, 2026 Code",
    test:
      "The reader has what they need to make an informed decision. Material limitations, exclusions and costs are not buried, omitted or deferred to a later conversation.",
    severity: "high",
  },
  {
    id: "vulnerability",
    name: "Consumers in vulnerable circumstances",
    source: "2026 Code; Guidance on Protecting Consumers in Vulnerable Circumstances",
    test:
      "Where the copy concerns illness, injury, disability, bereavement, career loss or retirement, it does not exploit distress, apply pressure, or use fear as a motivator. Vulnerability may be temporary or permanent.",
    severity: "critical",
  },
  {
    id: "no-invented-proof",
    name: "No invented testimonials, figures or outcomes",
    source: "Fair and not misleading; consent requirements",
    test: "No client story, name, job title, figure or outcome that is not real and consented.",
    severity: "critical",
  },
  {
    id: "association-wording",
    name: "Association wording not overstated",
    source: "Fair and not misleading",
    test:
      "Partnership status is stated accurately and never implies endorsement of advice. No partnership is implied where none exists.",
    severity: "critical",
  },
  {
    id: "sustainability",
    name: "Sustainability claims",
    source: "2026 Code greenwashing provisions",
    test:
      "Any climate or sustainability feature is described clearly and not overstated. Omit rather than approximate.",
    severity: "high",
  },
  {
    id: "no-retired-facts",
    name: "No retired or disputed facts reproduced",
    source: "Internal fact base",
    test: "Nothing marked retired or disputed in the fact base appears in the copy.",
    severity: "critical",
  },
];

export function codeRulesForPrompt(): string {
  return `CENTRAL BANK OF IRELAND — CONSUMER PROTECTION CODE, in force since 24 March 2026.
The Standards for Business are absolute requirements. "We took reasonable
measures" is not a defence. Check every rule below by name and report each one.

${CODE_RULES.map(
  (r) => `- ${r.name} [${r.severity}] (${r.source})\n    ${r.test}`
).join("\n")}`;
}

/* ------------------------------------------------- plain language scoring -- */

/**
 * Computed in code, not by the model. A language model asked "is this plain
 * English?" will tell you what you want to hear; syllable counting will not.
 */

const JARGON = [
  "adjudication", "ancillary", "annuitisation", "commensurate", "crystallisation",
  "decumulation", "de-risking", "disbursement", "encashment", "endowment",
  "hereinafter", "indemnity", "notwithstanding", "pursuant", "quantum",
  "remuneration", "subrogation", "utilise", "vesting", "aforementioned",
  "in respect of", "in the event that", "prior to", "with regard to",
  "at this moment in time", "in order to", "for the purposes of",
];

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const cleaned = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const m = cleaned.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

export interface PlainLanguageScore {
  readingEase: number;
  gradeLevel: number;
  avgSentenceLength: number;
  longSentences: { text: string; words: number }[];
  passiveHits: string[];
  jargonHits: string[];
  verdict: "clear" | "acceptable" | "too complex";
  summary: string;
}

export function scorePlainLanguage(text: string): PlainLanguageScore {
  // Strip hashtags, URLs, citation markers and the regulatory boilerplate,
  // which would otherwise skew the score without being read as prose.
  const body = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#\w+/g, "")
    .replace(/\[(S\d+|V\d+|VERIFY:[^\]]*)\]/g, "")
    .replace(/OFM Financial Ltd.*?Central Bank of Ireland\./gs, "");

  const sentences = body
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length > 2);

  const words = body.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  const wordCount = words.length || 1;
  const sentenceCount = sentences.length || 1;
  const syllableCount = words.reduce((n, w) => n + syllables(w), 0);

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllables = syllableCount / wordCount;

  const readingEase =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllables;
  const gradeLevel = 0.39 * avgSentenceLength + 11.8 * avgSyllables - 15.59;

  const longSentences = sentences
    .map((s) => ({ text: s, words: s.split(/\s+/).filter(Boolean).length }))
    .filter((s) => s.words > 25)
    .sort((a, b) => b.words - a.words)
    .slice(0, 5);

  // Rough passive detection: a form of "to be" followed by a past participle.
  const passiveHits: string[] = [];
  const passive = /\b(is|are|was|were|be|been|being)\s+(\w+(?:ed|en|wn|ght))\b/gi;
  let m: RegExpExecArray | null;
  while ((m = passive.exec(body)) !== null && passiveHits.length < 8) {
    passiveHits.push(m[0]);
  }

  const lower = body.toLowerCase();
  const jargonHits = JARGON.filter((j) => lower.includes(j));

  // NALA-style plain English sits around reading ease 60+. Financial content
  // rarely gets there, so 50 is treated as acceptable and below 40 as a problem.
  const verdict =
    readingEase >= 60 ? "clear" : readingEase >= 45 ? "acceptable" : "too complex";

  const bits: string[] = [
    `Reading ease ${readingEase.toFixed(0)}`,
    `about grade ${Math.max(1, gradeLevel).toFixed(0)}`,
    `${avgSentenceLength.toFixed(0)} words per sentence`,
  ];
  if (longSentences.length) bits.push(`${longSentences.length} sentences over 25 words`);
  if (jargonHits.length) bits.push(`${jargonHits.length} jargon terms`);

  return {
    readingEase: Number(readingEase.toFixed(1)),
    gradeLevel: Number(Math.max(1, gradeLevel).toFixed(1)),
    avgSentenceLength: Number(avgSentenceLength.toFixed(1)),
    longSentences,
    passiveHits,
    jargonHits,
    verdict,
    summary: bits.join(" · "),
  };
}

/* ------------------------------------------------------ vulnerability -- */

export const VULNERABILITY_TRIGGERS = [
  "illness", "sick", "disability", "disabled", "injury", "injured", "cancer",
  "diagnosis", "terminal", "death", "die", "dying", "bereavement", "widow",
  "burnout", "breakdown", "redundancy", "unemployed", "retirement", "dementia",
  "mental health", "depression", "addiction", "divorce", "carer",
];

export function vulnerabilityTouch(text: string): string[] {
  const lower = text.toLowerCase();
  return VULNERABILITY_TRIGGERS.filter((t) => lower.includes(t));
}

/* -------------------------------------------------------- risk scoring -- */

export interface RiskInput {
  compliance?: { rule: string; status: string }[];
  claims?: { status: string }[];
  plain?: PlainLanguageScore;
}

/**
 * 0 is clean, 100 is do-not-publish. Weighted so that a single critical
 * compliance failure or a contradicted claim dominates everything else —
 * twenty style nits should never outrank one misleading statement.
 */
export function riskScore(input: RiskInput): { score: number; band: string; drivers: string[] } {
  const drivers: string[] = [];
  let score = 0;

  for (const c of input.compliance || []) {
    if (c.status !== "fail") continue;
    const rule = CODE_RULES.find((r) => r.name === c.rule);
    const weight = rule?.severity === "critical" ? 35 : rule?.severity === "high" ? 18 : 8;
    score += weight;
    drivers.push(`${c.rule} failed`);
  }

  const contradicted = (input.claims || []).filter((c) => c.status === "contradicted").length;
  const unverified = (input.claims || []).filter((c) => c.status === "unverified").length;
  if (contradicted) {
    score += contradicted * 30;
    drivers.push(`${contradicted} contradicted ${contradicted === 1 ? "claim" : "claims"}`);
  }
  if (unverified) {
    score += Math.min(unverified * 7, 28);
    drivers.push(`${unverified} unverified ${unverified === 1 ? "claim" : "claims"}`);
  }

  if (input.plain?.verdict === "too complex") {
    score += 12;
    drivers.push("reads too complex for the plain language obligation");
  } else if (input.plain?.verdict === "acceptable" && input.plain.longSentences.length > 3) {
    score += 5;
    drivers.push("several long sentences");
  }

  score = Math.min(Math.round(score), 100);
  const band =
    score === 0 ? "clean" : score < 20 ? "low" : score < 50 ? "medium" : score < 75 ? "high" : "severe";

  return { score, band, drivers };
}
