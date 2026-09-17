/**
 * OMEGA FACT BASE
 * ---------------------------------------------------------------------------
 * This is the single source of truth for every Omega-specific claim the
 * generator is allowed to make. If a fact is not in here, the model must not
 * assert it — it must either pull it from a live cited source or leave it out.
 *
 * TO EDIT: change the values below, commit, push. No other file needs touching.
 *
 * status:
 *   "verified" — approved for publication, use freely
 *   "disputed" — sources disagree. The model is instructed NEVER to state these
 *                until a human resolves them. Fix the value and set "verified".
 *   "retired"  — was true, is no longer. The model is instructed to actively
 *                avoid it, because old collateral still contains it.
 */

export type FactStatus = "verified" | "disputed" | "retired";

export interface Fact {
  id: string;
  label: string;
  value: string;
  status: FactStatus;
  note?: string;
}

export const FACTS: Fact[] = [
  // --- Entity & regulation -------------------------------------------------
  {
    id: "legal-entity",
    label: "Legal entity",
    value: "OFM Financial Ltd T/A Omega Financial Management",
    status: "verified",
  },
  {
    id: "regulator",
    label: "Regulatory line (mandatory footer)",
    value:
      "OFM Financial Ltd T/A Omega Financial Management, regulated by the Central Bank of Ireland.",
    status: "verified",
    note: "Must appear on every published asset without exception.",
  },
  {
    id: "phone",
    label: "Phone",
    value: "+353 1 293 8554",
    status: "verified",
  },
  {
    id: "locations",
    label: "Locations",
    value: "Sandyford, Dublin and Beacon Hospital, Dublin",
    status: "verified",
  },
  {
    id: "website",
    label: "Website",
    value: "omegafinancial.ie",
    status: "verified",
  },

  // --- Proof points --------------------------------------------------------
  {
    id: "years-trading",
    label: "Years in business",
    value: "25 years",
    status: "disputed",
    note:
      'Brand Guide 2026 says 25 years. Some legacy LinkedIn collateral says "20+ years". ' +
      "Resolve and set to verified before this appears in any published copy.",
  },
  {
    id: "client-count",
    label: "Professional client count",
    value: "2,000+ professional clients",
    status: "disputed",
    note:
      "Brand Guide 2026 states 2,000+. Live site assets state 2,500+. " +
      "Do not publish a figure until this is reconciled.",
  },
  {
    id: "tagline",
    label: "Tagline",
    value:
      "Personalised solutions for medical professionals to achieve financial peace of mind",
    status: "verified",
  },
  {
    id: "positioning",
    label: "One-line positioning",
    value:
      "Omega Financial Management is the specialist financial advisor for Ireland's medical " +
      "and professional clients, combining profession-specific expertise, personalised " +
      "service, association credibility, and long-term financial planning support.",
    status: "verified",
  },

  // --- Associations --------------------------------------------------------
  {
    id: "assoc-ida",
    label: "IDA partnership (Dentists)",
    value: "Active partnership with the Irish Dental Association",
    status: "verified",
  },
  {
    id: "assoc-ihca",
    label: "IHCA partnership (Medical Consultants)",
    value: "Active partnership with the Irish Hospital Consultants Association",
    status: "verified",
  },
  {
    id: "assoc-ipu",
    label: "IPU partnership (Pharmacists)",
    value: "Active partnership with the Irish Pharmacy Union",
    status: "verified",
  },
  {
    id: "assoc-scsi",
    label: "SCSI partnership (Chartered Surveyors)",
    value: "Active partnership with the Society of Chartered Surveyors Ireland",
    status: "verified",
    note: "Surveyors are no longer a priority acquisition segment. Partnership is real; deprioritise in creative.",
  },
  {
    id: "assoc-icgp",
    label: "ICGP partnership (GPs)",
    value: "Not yet confirmed",
    status: "retired",
    note:
      "There is NO confirmed GP association partnership. Never imply one. " +
      "For GPs, lead on independence and GMS specialism instead.",
  },

  // --- Services ------------------------------------------------------------
  {
    id: "services",
    label: "Core services",
    value:
      "Income Protection, Pensions, Wealth Management, Staff Pensions, Child Savings Plans",
    status: "verified",
  },
  {
    id: "day-one-ip",
    label: "Day One Income Protection",
    value: "Withdrawn — no longer offered as of September 2026",
    status: "retired",
    note:
      "Legacy collateral still references this. It must never appear in new content.",
  },
  {
    id: "lead-services",
    label: "Lead service message",
    value:
      "Income Protection and Pensions should lead most profession-specific campaigns",
    status: "verified",
  },

  // --- Audience ------------------------------------------------------------
  {
    id: "target-professions",
    label: "Priority professions (from Sept 2026)",
    value: "Dentists, GPs, Medical Consultants and Pharmacists only",
    status: "verified",
    note:
      "Vets and Surveyors are downgraded in acquisition effort. Do not write new " +
      "acquisition content for them unless explicitly asked.",
  },
  {
    id: "primary-revenue",
    label: "Primary revenue segments",
    value: "GPs and Dentists",
    status: "verified",
  },
];

/** Figures that sit outside Omega's own walls and must be cited live, never recalled. */
export const MUST_CITE_LIVE = [
  "State Illness Benefit rates and weekly/annual values",
  "Pension standard fund threshold, age-related contribution limits, earnings cap",
  "Income tax, USC, PRSI and CGT rates, bands and relief percentages",
  "Auto-enrolment contribution rates, thresholds and go-live dates",
  "Budget announcements and any Finance Act change",
  "GMS contract terms, HSE pay scales and consultant contract detail",
  "Any association discount percentage or member offer",
  "Any competitor claim, market share or ranking",
  "Any statistic about the profession being written about",
];

export function factsForPrompt(): string {
  const verified = FACTS.filter((f) => f.status === "verified");
  const disputed = FACTS.filter((f) => f.status === "disputed");
  const retired = FACTS.filter((f) => f.status === "retired");

  const fmt = (f: Fact) =>
    `- [${f.id}] ${f.label}: ${f.value}${f.note ? ` — NOTE: ${f.note}` : ""}`;

  return `APPROVED FACTS (you may state these; cite the id in your claim ledger):
${verified.map(fmt).join("\n")}

DISPUTED — DO NOT STATE THESE AT ALL. Write around them. If the copy would be
weaker without the figure, say so in your notes rather than guessing:
${disputed.map(fmt).join("\n")}

RETIRED / FALSE — these appear in old Omega collateral but are NOT true now.
Never reproduce them, and flag if the user's brief implies one:
${retired.map(fmt).join("\n")}

FIGURES YOU MUST NEVER RECALL FROM MEMORY — these change and your training data
is stale. Use only a live cited source from the research panel, or omit and flag:
${MUST_CITE_LIVE.map((m) => `- ${m}`).join("\n")}`;
}
