/**
 * Brand voice, style and compliance rules, transcribed from the
 * Omega Master Brand Guide 2026. Edit here to change how everything is written.
 */

export const VOICE = `CORE VOICE
Professional, educational, warm, direct, and profession-specific. The reader
should feel Omega understands their working world and can reduce the financial
complexity around it.

WE ARE / WE ARE NOT
- Professional and authoritative — credible, expert, measured. Not stiff, corporate or jargon-heavy.
- Educational and informative — clear, explanatory, empowering. Not patronising or lecture-like.
- Warm and reassuring — human, empathetic, calm. Not sentimental, alarming or fear-led.
- Direct and confident — clear in recommendations and next steps. Not pushy, blunt or evasive.

BRAND PRINCIPLES
- Specific beats generic. Always name the profession, career stage and financial issue.
- Clarity beats complexity. Translate pensions, protection, tax and investment into plain English.
- Empathy beats urgency. Acknowledge risk without fear-mongering. Calm, do not alarm.
- Advice beats products. Omega sells planning and judgement, not isolated policies.

MESSAGING PILLARS — every asset carries at least one; the strongest carry three
(Specialist knowledge, Proven trust, Financial clarity):
1. Specialist knowledge — Omega understands the financial reality of these careers.
2. Proven trust — longevity and existing client relationships.
3. Personalised service — plans reflect career stage, income structure, family, practice position.
4. Financial clarity — complex rules become practical next steps.
5. Peace of mind — the emotional outcome is confidence and reduced financial stress.

PREFERRED TERMINOLOGY
- "Clients" not "customers".
- "Income Protection" not "insurance".
- "Personalised" or "tailored", never "bespoke" or "custom".
- "Financial peace of mind", never "cheap", "value" or "buy now".
- Profession-specific wording, never generic "professionals".
- "We" and "our clients", not "the client".

STYLE RULES
- British spelling throughout.
- Sentence case for headings. No all caps except short labels.
- Spell out numbers one to nine; use numerals for 10 and above.
- Use % rather than the word percentage.
- Short paragraphs: two to four lines.
- Emojis only on Instagram, and only where they add warmth.
- Never start a post with "I".`;

export const COMPLIANCE = `COMPLIANCE RULES — Central Bank of Ireland regulated firm. These are hard stops.
- No guaranteed outcomes. Never promise returns, claims success, pension outcomes
  or absolute protection unless a specific provider guarantee exists and is explained.
- No unsubstantiated superiority. Never "best", "number one", "Ireland's leading",
  "top", "#1" or equivalent.
- Advice versus information. Educational content must state it is general
  information and not personalised financial advice.
- Client stories. Never invent a testimonial, name, job title, figure or outcome.
  If the brief asks for one, output a clearly marked placeholder instead.
- Association wording. Never overstate partnership status or imply endorsement
  beyond the approved wording. Never imply a partnership that does not exist.
- Every asset ends with the mandatory regulatory line.

DISCLAIMERS — attach the one that matches the subject matter:
- General: "This content is for information purposes only and does not constitute
  financial advice. Please speak with a qualified advisor for advice tailored to
  your circumstances."
- Investment: "The value of investments may fall as well as rise. Any decision
  should be based on your objectives, time horizon, and capacity for risk."
- Pension: "Pension rules, tax relief, limits, and thresholds may change. Personal
  eligibility depends on individual circumstances."
- Income Protection: "Cover, premiums, exclusions, waiting periods, and claim
  eligibility depend on provider terms, occupation, health, income, and underwriting."
- Tax: "Tax treatment depends on individual circumstances and may change in the future."`;

export interface ChannelSpec {
  id: string;
  name: string;
  blurb: string;
  formats: { id: string; name: string; hint: string }[];
  spec: string;
}

export const CHANNELS: ChannelSpec[] = [
  {
    id: "email",
    name: "Email",
    blurb: "Personal, useful, direct",
    formats: [
      { id: "newsletter", name: "Monthly newsletter", hint: "Existing clients" },
      { id: "campaign", name: "Campaign burst", hint: "Time-sensitive, one topic" },
      { id: "nurture", name: "Nurture email", hint: "Part of a sequence" },
      { id: "reminder", name: "Review or deadline reminder", hint: "Short, single action" },
    ],
    spec: `EMAIL
Tone: personal, useful, direct. One message and one CTA per email — no exceptions.
Structure: subject line, preview text, greeting, one idea developed in 3–5 short
paragraphs, single CTA, sign-off from a named advisor, regulatory line.
Sender should read human — an advisor name or "the Omega team", never generic marketing.
Give three subject line options with the recommended one first. Keep subject lines
under 60 characters. Preview text must not repeat the subject line.
Segment cues (profession, career stage, service held) should be visible in the copy.
Length: 150–300 words in the body.`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    blurb: "Thought leadership, educate first",
    formats: [
      { id: "short", name: "Short post", hint: "200–400 words" },
      { id: "article", name: "Long-form article", hint: "600–900 words" },
      { id: "outreach", name: "Sales Navigator message", hint: "150–250 words" },
      { id: "sequence", name: "Connection sequence", hint: "Request + 2–3 follow-ups" },
    ],
    spec: `LINKEDIN
Tone: thought-leadership, professional insight, sector-specific. Educate first, sell softly.
Content mix across the account is 60% educational, 30% trust-building, 10% direct offer.
Never open with "I".

Short post: hook (2–3 lines naming the profession or the risk) → the problem
(3–5 specific, profession-grounded lines) → Omega's role (3–5 lines) → one CTA →
contact block → regulatory line → 5–7 hashtags including #OmegaFinancial.

Long-form article: opening that acknowledges the profession's skill then pivots to
financial exposure → "The real risks [profession]s face" → what good planning looks
like → Omega's approach → CTA → disclaimer and regulatory line. Use subheadings.

Sales Navigator message: no hook gimmicks, no flattery. Name the specific financial
issue for their profession, one sentence on why Omega is relevant, one low-friction ask.
Never attach a pitch deck in the first message.

Connection sequence: request under 300 characters, then follow-ups at day 3 and day 10,
each giving something before asking for anything.`,
  },
  {
    id: "instagram",
    name: "Instagram",
    blurb: "Warm, visual, human",
    formats: [
      { id: "carousel", name: "Carousel", hint: "Simple education, slide by slide" },
      { id: "reel", name: "Reel script", hint: "Short explainer" },
      { id: "single", name: "Single post", hint: "One point, one graphic" },
      { id: "story", name: "Story sequence", hint: "Q&A or poll" },
    ],
    spec: `INSTAGRAM
Tone: warm, visual, human, accessible. Simplify one point at a time. Shorter captions
than LinkedIn but the professional tone holds.
Emojis are permitted here only, and only where they add warmth. Never more than three.

Carousel: give slide-by-slide copy. Slide 1 is a Crimson cover with a hook of six
words or fewer. Slides 2–6 are Cream content slides, one idea each, under 25 words.
Final slide is a CTA. Supply the caption separately, plus alt text for each slide.

Reel script: hook in the first two seconds, three beats, one CTA. Give spoken lines
and on-screen text separately. 30–45 seconds. Single-advisor talking head.

Every output includes: caption, alt text, and 5–8 profession-specific hashtags
used carefully and without clutter. Regulatory line goes in the caption.`,
  },
  {
    id: "website",
    name: "Website article",
    blurb: "Expert, informative, practical",
    formats: [
      { id: "blog", name: "Blog article", hint: "800–1,200 words" },
      { id: "guide", name: "Guide or explainer", hint: "Longer, structured" },
      { id: "landing", name: "Landing page copy", hint: "Profession-specific" },
      { id: "faq", name: "FAQ block", hint: "Real advisor questions" },
    ],
    spec: `WEBSITE ARTICLE
Tone: expert, informative, practical. Answer real questions advisors hear from clients.
Avoid generic financial advice pages — Omega's advantage is specificity.

Structure: H1 (sentence case, benefit-led), a 40–60 word standfirst, then H2 sections
with short scannable paragraphs. Use a table where information is genuinely comparative
(limits, options, career stages). Close with a clear conversion point: book a free
consultation, download a guide, or request a review.

Also return: a meta title under 60 characters, a meta description under 155 characters,
the primary keyword in profession + product form (for example "income protection for
dentists Ireland"), and three internal link suggestions expressed as page topics.

Disclaimer and regulatory line at the foot.`,
  },
  {
    id: "print",
    name: "Print article",
    blurb: "Association journals and brochures",
    formats: [
      { id: "journal", name: "Association journal piece", hint: "IDA, IPU, IHCA" },
      { id: "brochure", name: "Brochure copy", hint: "Profession-specific" },
      { id: "advertorial", name: "Advertorial", hint: "Paid placement" },
      { id: "onepager", name: "One-page leave-behind", hint: "Event or meeting" },
    ],
    spec: `PRINT ARTICLE
Tone: expert and considered. Print has a long shelf life, so avoid anything
time-sensitive that will date badly — no "this year", no current rates without the
year stated, no campaign language.

Structure: headline, standfirst, body in sections with subheadings, a pull-quote
candidate marked clearly, and a boxed "next step" panel with contact details.
State a word count target and stick within 10% of it.
Where the piece runs in an association journal, the association relationship should be
acknowledged in approved wording only — never as an endorsement of advice.

Because this cannot be corrected after printing, flag every date-sensitive figure
explicitly and state the date it was verified.

Mandatory regulatory line and the matching disclaimer must be included in the layout.`,
  },
];

export const PROFESSIONS = [
  { id: "gp", name: "GP", note: "No association partnership. Lead on independence and GMS specialism. Primary revenue segment." },
  { id: "dentist", name: "Dentist", note: "IDA partnership. Primary revenue segment. Physical-dependency angle is strong." },
  { id: "consultant", name: "Medical Consultant", note: "IHCA partnership. HSE versus private income split is the core complexity." },
  { id: "pharmacist", name: "Pharmacist", note: "IPU partnership. Practice ownership and staff pensions are live issues." },
];

export const TONES = [
  { id: "educational", name: "Educational", hint: "Explain the problem" },
  { id: "thought", name: "Thought leadership", hint: "Sector insight" },
  { id: "promotional", name: "Promotional", hint: "Soft lead generation" },
  { id: "seasonal", name: "Timely or seasonal", hint: "Budget, deadline, news hook" },
];
