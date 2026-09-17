# Omega Content Studio

Drafting tool for Omega Financial Management. Writes email, Instagram, LinkedIn,
website articles and print articles in the Omega brand voice, grounded in a locked
fact base and live web sources, with a separate compliance audit on every draft.

---

## What it actually guarantees

It does **not** guarantee 100% factual accuracy. No language model can, and
promising it on Central Bank regulated content would be worse than useless.

What it does instead:

**1. A locked fact base.** Every Omega-specific claim — the regulatory line, the
phone number, which association partnerships exist — lives in `lib/facts.ts`. The
model is given that list and told that anything outside it is off limits. Facts are
tagged one of three ways:

- `verified` — approved, use freely
- `disputed` — sources disagree, so the model is forbidden from stating it at all
- `retired` — was true, is not now, and appears in old collateral the model must not copy

Two things are currently marked `disputed` and will not appear in any output until
you resolve them:

- **Years in business.** The Brand Guide says 25 years; legacy LinkedIn material says 20+.
- **Client count.** The Brand Guide says 2,000+; live site assets say 2,500+.

One thing is marked `retired`: **Day One Income Protection**, withdrawn September
2026. Also retired: any implication of an **ICGP partnership**, since there is no
confirmed GP association relationship.

**2. No recalled figures.** Illness Benefit rates, pension thresholds, tax bands,
auto-enrolment rates, Budget changes, GMS terms — the model is explicitly barred
from writing these from memory, because its training data is stale. It must either
cite an attached live source or write `[VERIFY: ...]` and list the gap.

**3. A claim ledger.** Every assertion in the draft is extracted and listed with
what it rests on — a fact-base id, a source number, or nothing.

**4. An independent audit.** A second pass re-reads the draft cold at temperature
zero, as an adversarial reviewer with no stake in it shipping. It re-checks every
claim, runs nine named compliance rules, and returns `ready`, `revise` or `block`.

A green verdict means "worth your time to review". It is not compliance approval.

---

## What each part does

### 1. Compliance built on the 2026 Code

The revised Consumer Protection Code has applied since **24 March 2026**, alongside
the Standards for Business Regulations. The Standards are **absolute requirements** —
a firm found in breach cannot defend itself on the grounds that it took reasonable
measures. That is why the record matters as much as the check.

`lib/compliance.ts` holds thirteen named rules, each checked and reported every
time. Three are new relative to the brand guide: **regulated versus unregulated
activity**, **plain language**, and **consumers in vulnerable circumstances**.

Income protection copy is always about illness, injury or career loss, which puts
it squarely inside the vulnerability provisions. When the draft touches any of
those, the ledger says so and asks for a second read on tone.

### 2. Plain language, scored in code

Reading ease, grade level, sentence length, passive voice and jargon are computed
in JavaScript, not asked of the model — a model asked "is this plain English?"
will tell you what you want to hear. The guidance behind the Code points at ISO
Plain Language Standards and NALA's writing tips; the scorer treats reading ease
60+ as clear, 45–60 as acceptable, below 45 as a problem.

### 3. Inline highlighting

The audit returns the exact offending words, which are highlighted in place.
Click one for the rule, the reason, and where there is a fix, a button that
applies it. Spans the model cannot quote verbatim are listed separately rather
than fuzzy-matched — a highlight on the wrong words is worse than none.

### 4. Risk score and review queue

Every audited piece gets 0–100. Weighted so one critical compliance failure or
one contradicted claim outranks twenty style nits. The queue sorts by score, then
by deadline.

### 5. Archive with roles

Three roles: marketing drafts and submits, compliance approves or blocks, advisors
sign off on technical accuracy. Only compliance can approve. Every state change
writes an immutable row in `versions` holding the text, the actor, the role, the
risk score, the audit and the sources as they stood at that moment.

**This records identity, it does not verify it.** Until the app sits behind your
SSO, treat it as an attestation. That limitation is stated in the interface too.

### 6. Campaigns

One brief, inherited by every piece. The funnel layer is explicit: a soft campaign
educates with no hard CTA, a hard campaign drives the action. Keeping them apart
is deliberate — collapsing them is how educational content turns into advertising.

### 7. Repurposing

Adapts an **approved** piece into another channel. The point is that the factual
work is already done, so the model is barred from adding anything: it may cut,
reorder and rewrite, but a figure not in the source cannot appear in the output.
It returns a `dropped` list so a reviewer can check nothing essential was lost.
Only approved pieces can be repurposed.

### 8. HubSpot

Private app token, not OAuth — one team does not need OAuth and a private app
takes five minutes. Blog posts and marketing emails are created as **drafts only**.
Nothing this tool does can publish to a live audience, and a piece with a `block`
verdict is refused.

### 9. Performance feedback

`performance` stores results, and `/api/performance` accepts them in bulk so you
can paste in HubSpot or LinkedIn exports.

**The constraint matters more than the feature.** Optimising for engagement in
regulated content is how a firm drifts into fear-led copy, and fear-led copy aimed
at people worried about illness is both a brand failure and a vulnerability problem
under the Code. So performance data may influence structure, hooks, length and
CTAs. It may never influence what is claimed or how it is caveated. Benchmarks
need five pieces and a sample of 30 before they surface at all — until then this
sits empty, which is correct.

### 10. Estate sweep

Fetches live pages and scans for retired facts, disputed figures and language the
Code does not allow. Out of the box it looks for Day One Income Protection, implied
ICGP partnership, the client-count and years-trading conflicts, superiority claims
and guaranteed-outcome language.

It reads rendered HTML, so pages built entirely in JavaScript may come back clean
when they are not. PDFs are skipped.

### Profession knowledge

Separate from the fact base. The fact base is what Omega may claim about itself;
this is what Omega knows about the client's working life — GMS absence provisions,
practice ownership models, consultant contract splits. Keep it qualitative;
anything numeric belongs in verified figures where it gets a source and an expiry.


---

## The craft layer

Ten additions aimed at the copy itself rather than the workflow around it.

**Career stage.** Your video programme already runs on three stages per
profession; the app now does too. Each stage carries general guidance plus a
profession-specific note — a mid-career GP note mentions partnership and
out-of-hours, a late-career dentist note mentions practice sale. The writer is
told explicitly not to hedge across all three, because a piece for everyone is a
piece for nobody.

**Advisor interview.** Generates eight questions designed to surface what a model
cannot produce — the objection they actually hear, the thing clients get wrong,
the case that changed how they explain something. Answers are saved and, when
attached to a draft, go in ahead of everything else. Twenty minutes with an
advisor is the single highest-value input in the system.

**Angles before drafts.** Three genuinely different takes as one-paragraph
pitches, each with an honest statement of its own weakness. Pick one, then draft.
Capped at three deliberately — more options cost attention, not just tokens.

**Real approved copy as exemplars.** Four pieces are seeded from the Brand Guide
and the July–September client programme. Two per channel go into every draft.
Add more through the Voice bank; the more real approved work in there, the less
the output drifts.

**Named frameworks.** Seven structures — the overlooked gap, problem then
mechanism, the career-stage arc, practical checklist, two routes compared, what
clients get wrong, triggered by a moment. Each channel gets the ones that suit it.
Without this the model picks a new shape every time and pieces drift structurally
even when the voice holds.

**Rewrite mode.** Six named transforms: simplify, cut length, re-aim, less
promotional, more specific, warmer. A simplify pass reports reading ease before
and after, so the claim is checkable rather than asserted. **A rewrite can never
add a claim or drop a caveat, whatever the transform asks** — if the transform
and that rule conflict, the rule wins and the model says so.

**Hook bank.** Fifteen openers that must differ in kind, not just wording —
question, statement, scenario, correction, consequence, comparison. Click one and
it becomes the direction for the draft.

**Series-aware sequences.** Plans the arc first: what each part adds, what it
deliberately holds back, what it asks for. Then writes each part with the arc and
everything already written in view, so part four does not reintroduce the subject.
Commitment escalates across the sequence and never opens on the strongest ask.

**Carousel artwork.** Returns brand-correct SVG slides at 1080×1080 in Crimson,
Gold and Cream with Poppins and real fallbacks, not just slide copy. SVG is
sanitised server-side before it renders. Text is wrapped explicitly per line,
because SVG does not wrap.

**Question bank.** What advisors actually get asked, per profession and stage,
split into questions, objections and misconceptions. Recording the same question
again raises its count rather than duplicating it — repetition is the signal.
Feeds every draft and the FAQ format directly.


---

## The learning database

Neon Postgres, added through the Vercel Marketplace. Vercel Postgres no longer
exists as a separate product — for new projects you install a Postgres
integration from the Marketplace, and Neon is the default.

### Setting it up

1. Vercel → your project → **Storage** → **Create Database** → **Neon**.
2. The integration creates the database and injects `DATABASE_URL` into the
   project. You do not add it by hand.
3. Redeploy.
4. Open the app → **Library** → **Create the tables**. Safe to run more than once.

If `DATABASE_URL` is absent the app still works — it simply cannot remember
anything between sessions. Nothing breaks.

### What it learns from, and what it does not

**This is retrieval, not training.** The model's weights never change. What
changes is the context it gets handed before it writes. That distinction matters:
it means everything the tool has "learned" is inspectable in the Library, and
anything wrong can be deleted rather than baked in.

Four things are stored:

**Approved work** (`pieces`). Every signed-off piece, with the brief, the AI
draft, and your edited version. Future drafts retrieve the three closest matches
by embedding similarity and match their register and structure. They are
explicitly told not to lift facts from them, because those were verified for
their own moment.

**Learned corrections** (`lessons`). After you approve an edited piece, a
separate pass compares the AI draft to your version and extracts what your edits
teach — as reusable instructions, not one-off fixes. Repeated lessons get a
`times_seen` count and rank higher. Approving an unedited draft deliberately
teaches nothing.

**Verified figures** (`verified_facts`). Illness Benefit rates, thresholds, tax
bands — checked by a person against a source, then cached with a **hard expiry**.
Past the expiry the writer cannot use them at all; they surface in the Library as
needing a re-check.

**Audit findings** (`findings`). Every compliance and voice failure, aggregated
so recurring ones become visible as a pattern.

### The guardrails on learning

A learning system pointed at regulated content can make things worse rather than
better. Three things stop that here:

- **Expiry on every cached figure.** A fact cache with no expiry is how a tool
  starts confidently publishing last year's rates. Nothing is cached
  indefinitely, and the maximum window is 12 months.
- **Lessons cannot loosen the rules.** The extraction pass is explicitly barred
  from writing a lesson that tells a future draft to drop a disclaimer, soften a
  caveat, state a figure more confidently, or skip a citation. If your edit did
  one of those, it is not learned.
- **The fact base still wins.** Retrieved context never overrides `lib/facts.ts`
  or the compliance rules. It shapes register and structure, not what may be
  claimed.

Everything is reversible. Retire a piece and it stops being a reference. Retire a
figure and it stops being offered.

### pgvector

The schema tries to enable pgvector for similarity retrieval. Neon supports it.
If it is unavailable, retrieval falls back to the most recent matching pieces
rather than the most similar — the tool still works, just less precisely. The
Library tells you which mode you are in.


---

## Deploying

```bash
git init
git add .
git commit -m "Omega Content Studio"
git remote add origin git@github.com:YOURNAME/omega-content-studio.git
git push -u origin main
```

Then in Vercel: **Add New → Project → import the repo**. It is a standard Next.js
app, so the defaults are correct. Do not change the build settings.

### Environment variables

Vercel → your project → **Settings → Environment Variables**:

| Variable | Value | Required |
|---|---|---|
| `OPENAI_API_KEY` | your OpenAI key | yes |
| `OPENAI_MODEL` | defaults to `gpt-4o` | no |
| `SEARCH_PROVIDER` | `tavily`, `serper` or `brave` | yes |
| `SEARCH_API_KEY` | key for whichever provider | yes |
| `DATABASE_URL` | injected by the Neon integration — do not set by hand | no |
| `HUBSPOT_TOKEN` | private app token, scopes `content` and `marketing-email` | no |

**Redeploy after adding them.** Vercel only picks up environment variables at build
time, so an existing deployment will not see them.

Keys are read server-side only, inside the API routes. They are never sent to the
browser, so anyone at Omega can use the tool without being able to read them.

### Which search provider

**Tavily** is the recommendation — it is built for grounding language models,
returns clean extracts with publication dates, and has a news mode with a date
window. Serper is cheaper and returns raw Google results. Brave is the privacy
option. All three are normalised in `lib/search.ts`, so switching is a one-line
environment change.

Results from Irish government, regulator and professional-body domains are ranked
above everything else, because a citation is only as good as what it points at. The
list is `PRIORITY_DOMAINS` in `lib/search.ts`.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

---

## Where to edit things

| You want to change | File |
|---|---|
| An Omega fact, or resolve a disputed one | `lib/facts.ts` |
| Brand voice, terminology, style rules | `lib/brand.ts` → `VOICE` |
| Compliance rules and disclaimers | `lib/brand.ts` → `COMPLIANCE` |
| How a channel is written | `lib/brand.ts` → `CHANNELS` |
| Add a profession | `lib/brand.ts` → `PROFESSIONS` |
| How the model is instructed | `lib/prompts.ts` |
| Trusted source domains | `lib/search.ts` → `PRIORITY_DOMAINS` |
| Colours and layout | `app/globals.css` |
| Code rules, plain-language scoring, risk weights | `lib/compliance.ts` |
| Career stages, frameworks, transforms, seeded exemplars | `lib/craft.ts` |
| What the estate sweep looks for | `lib/estate.ts` |
| HubSpot push behaviour | `lib/hubspot.ts` |
| Database schema | `lib/db.ts` |
| What gets retrieved and how | `lib/learn.ts` |

`lib/facts.ts` is the one most worth keeping current. It is the difference between
a tool that drifts and one that does not.

---

## Using it

1. Pick the channel in the sidebar, then the format and audience.
2. Write the topic. Use the direction box for the angle and anything to avoid.
3. Search for sources and tick the ones to attach. **Attach sources before
   drafting** — without them the piece cannot include any external figure.
4. Write the draft. Edit it directly in the panel.
5. Run the audit. It audits what is on screen, so it covers your edits too.
6. Work through the ledger, fix what it flags, re-audit.

---

## Known limits

- A model can misread a source, and a source can itself be out of date. The audit
  catches a good deal of this but not all of it.
- The audit and the draft use the same model family, so they share some blind
  spots. Running the audit on a different model via `OPENAI_MODEL` reduces that.
- Long print articles can exceed the JSON response ceiling. Split them if so.
- Serverless functions are capped at 60 seconds on Vercel's Hobby tier. Long
  website articles may need the Pro tier.
- Neon's free tier scales to zero, so the first request after an idle period is
  slow. Only the Library and the approval step touch the database.
- Learning is only as good as what you approve. Approving a piece you have not
  properly read teaches the tool to produce more of it.
- Roles are attestation, not authentication, until the app is behind SSO.
- The estate sweep cannot read JavaScript-rendered pages or PDFs.
- Performance learning has no data until you have shipped enough work to reach
  the thresholds. That is by design, not a bug to work around.
- The craft layer is only as good as what you put in it. Seeded exemplars and an
  empty question bank will still produce generic copy; an advisor interview and
  ten real client questions will not.
- None of this is compliance sign-off, and none of it is legal advice. It is a
  first-pass filter designed to catch the obvious before a person looks.
