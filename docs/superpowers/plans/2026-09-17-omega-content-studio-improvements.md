# Omega Content Studio Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the approved ten improvements to Omega Content Studio while preserving the existing D1 database, Luna model, Irish-source safeguards and public deployment.

**Architecture:** Improve the existing Next.js/vinext single-page workspace incrementally. Keep page orchestration in `app/page.tsx`, use focused components for brief, draft status, evidence and recovery, and keep all persistence in D1 route handlers. Reuse the existing CSS tokens and route contracts unless a new route is required.

**Tech Stack:** React, TypeScript, Next.js-compatible vinext, Cloudflare D1, existing CSS, GPT-5.6 Luna, Sites hosting.

**Spec:** `docs/superpowers/specs/2026-09-17-omega-content-studio-improvements-design.md`

## Global Constraints

- Preserve existing D1 records; do not drop or reset tables.
- Keep Irish sources, expiry checks and mandatory Omega regulatory wording.
- Keep the app usable when AI, search or vector services are unavailable.
- Do not expose API keys or internal runtime values in the UI.
- Work on the existing `feature-updates` branch and publish the exact tested source state.
- Run `npm run build` after each implementation batch.

### Task 1: Add shared content-status and date utilities

**Files:**
- Create: `lib/uiState.ts`
- Modify: `lib/learn.ts`
- Modify: `components/Knowledge.tsx`
- Modify: `components/Library.tsx`

**Interfaces:**
- Produces `CONTENT_STATUSES`, `safeDisplayDate(value: string | null | undefined): string`, and `statusLabel(status: string): string`.

- [ ] **Step 1: Add safe shared helpers**

Create the typed status list and invalid-date fallback helper. Keep the fallback human-readable and never throw during render.

- [ ] **Step 2: Replace duplicated unsafe date formatting**

Use `safeDisplayDate` in knowledge and library views and in learned prompt rendering.

- [ ] **Step 3: Run the build**

Run: `npm run build`

Expected: Build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add lib/uiState.ts lib/learn.ts components/Knowledge.tsx components/Library.tsx
git commit -m "refactor: share safe content UI state helpers"
```

### Task 2: Build the guided creation brief

**Files:**
- Create: `components/BriefProgress.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `BriefProgress` accepts `{ steps: { label: string; complete: boolean }[] }` and renders progress plus the next incomplete step.

- [ ] **Step 1: Add progress component**

Render a labelled progress bar, completed count and next-action sentence using existing classes/tokens.

- [ ] **Step 2: Add it to the creation view**

Pass the current channel, format, profession, topic and notes state. Mark topic and notes as the two user-entered completion steps.

- [ ] **Step 3: Keep the generate action visible**

Place the main generate button in a sticky action row on narrow screens and after the brief on wide screens.

- [ ] **Step 4: Run the build and commit**

Run: `npm run build`

```bash
git add components/BriefProgress.tsx app/page.tsx app/globals.css
git commit -m "feat: add guided creation brief progress"
```

### Task 3: Add local draft autosave and recovery

**Files:**
- Create: `hooks/useDraftRecovery.ts`
- Modify: `app/page.tsx`
- Modify: `components/BriefProgress.tsx`

**Interfaces:**
- `useDraftRecovery<T>(key: string, value: T, enabled?: boolean)` returns `{ recovered: boolean; dismissRecovery(): void; clearRecovery(): void }` and stores JSON in `localStorage` with a timestamp.

- [ ] **Step 1: Implement the hook with browser guards**

Handle unavailable storage, malformed JSON and server rendering without throwing.

- [ ] **Step 2: Persist the active brief**

Persist profession, channel, format, tone, topic, notes, stage, framework and word target. Do not persist API keys or generated secrets.

- [ ] **Step 3: Restore only an unfinished brief**

On mount, restore the saved brief when it contains meaningful input and show a dismissible recovery notice.

- [ ] **Step 4: Add clear recovery actions**

Add “Restore”, “Dismiss” and “Start fresh” actions that do not delete database content.

- [ ] **Step 5: Run the build and commit**

Run: `npm run build`

```bash
git add hooks/useDraftRecovery.ts app/page.tsx components/BriefProgress.tsx
git commit -m "feat: recover unfinished content briefs"
```

### Task 4: Improve draft status and review visibility

**Files:**
- Create: `components/StatusBadge.tsx`
- Modify: `app/page.tsx`
- Modify: `components/Queue.tsx`
- Modify: `components/Library.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `StatusBadge` accepts `{ status: string }` and renders the standard label and non-colour text cue.

- [ ] **Step 1: Add the status badge**

Support Draft, Needs review, Compliance review, Approved and Archived with stable class names.

- [ ] **Step 2: Add status to the active draft**

Show Draft before generation, Needs review after generation, and Compliance review while audit output requires changes.

- [ ] **Step 3: Add status to queue and approved work**

Show Approved or Archived using the existing data fields without changing the database schema.

- [ ] **Step 4: Add accessible status styles**

Use text labels, borders and icons so colour is not the only signal.

- [ ] **Step 5: Run the build and commit**

Run: `npm run build`

```bash
git add components/StatusBadge.tsx app/page.tsx components/Queue.tsx components/Library.tsx app/globals.css
git commit -m "feat: clarify content review statuses"
```

### Task 5: Upgrade knowledge and fact-base usability

**Files:**
- Modify: `components/Knowledge.tsx`
- Modify: `components/Library.tsx`
- Modify: `app/api/knowledge/route.ts`
- Modify: `app/api/facts/route.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Add client-side `query` and `reviewFilter` state to both views.
- Add `PATCH /api/knowledge` with `{ id, profession, topic, body, sourceUrl, addedBy, monthsValid }` returning `{ ok: true, id }`.

- [ ] **Step 1: Add the knowledge edit endpoint**

Validate all required fields, calculate the review date server-side, update the existing row and return a useful error without throwing raw internals to the user.

- [ ] **Step 2: Add search and review filters**

Filter by profession, text and active/expiring/expired state while retaining the existing profession tabs.

- [ ] **Step 3: Add inline edit forms**

Allow editing topic, detail, source, reviewer and review period. Preserve the user’s input on failure and show success after D1 confirms the update.

- [ ] **Step 4: Improve fact-base controls**

Add search, “expiring soon” filtering and a visible explanation that numeric figures require sources and review dates.

- [ ] **Step 5: Run the build and commit**

Run: `npm run build`

```bash
git add components/Knowledge.tsx components/Library.tsx app/api/knowledge/route.ts app/api/facts/route.ts app/globals.css
git commit -m "feat: make knowledge and fact review workflows searchable"
```

### Task 6: Add evidence transparency to generated drafts

**Files:**
- Create: `components/EvidencePanel.tsx`
- Modify: `app/page.tsx`
- Modify: `app/api/generate/route.ts`
- Modify: `lib/learn.ts`
- Modify: `app/globals.css`

**Interfaces:**
- `EvidencePanel` accepts `{ facts: { id: number; claim: string; source_url: string }[]; knowledge: { id: number; topic: string; source_url: string | null }[]; sources: { title: string; url: string }[] }`.
- Generate responses include `evidence: { facts; knowledge; sources }` while preserving existing draft fields.

- [ ] **Step 1: Return evidence metadata from generation**

Collect IDs and URLs already present in the retrieval context and attach them to the response; do not add new claims.

- [ ] **Step 2: Render the evidence panel**

Separate verified figures, profession knowledge and live Irish sources. Include links and a statement that background knowledge is not a substitute for fact verification.

- [ ] **Step 3: Add loading and empty states**

Show “No stored evidence used” when the draft was created without database context.

- [ ] **Step 4: Run the build and commit**

Run: `npm run build`

```bash
git add components/EvidencePanel.tsx app/page.tsx app/api/generate/route.ts lib/learn.ts app/globals.css
git commit -m "feat: show evidence used in generated drafts"
```

### Task 7: Simplify navigation and responsive layout

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Group navigation items**

Use Create, Review, Knowledge and Library groups while preserving existing route selections.

- [ ] **Step 2: Add mobile navigation behaviour**

Collapse the sidebar into a labelled menu control at narrow widths and close it after selection.

- [ ] **Step 3: Improve the main layout**

Set readable content widths, reduce nested panel density and ensure action rows wrap without horizontal overflow.

- [ ] **Step 4: Preserve scrollbar-free sidebar behaviour**

Keep hidden scrollbar styling while ensuring keyboard users can still scroll the navigation.

- [ ] **Step 5: Run the build and commit**

Run: `npm run build`

```bash
git add components/Sidebar.tsx app/page.tsx app/globals.css
git commit -m "feat: simplify responsive workspace navigation"
```

### Task 8: Strengthen compliance review presentation

**Files:**
- Create: `components/ReviewSummary.tsx`
- Modify: `app/page.tsx`
- Modify: `components/HighlightedDraft.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add grouped review summary**

Group audit findings into Blocked, Changes required and Passed, with counts and plain-language explanations.

- [ ] **Step 2: Link findings to draft text**

Keep existing highlighting and add a nearby finding list that scrolls to the relevant marked content when a span is available.

- [ ] **Step 3: Make the Omega footer requirement visible**

Show a specific footer check and a copy-safe explanation of the required wording.

- [ ] **Step 4: Run the build and commit**

Run: `npm run build`

```bash
git add components/ReviewSummary.tsx app/page.tsx components/HighlightedDraft.tsx app/globals.css
git commit -m "feat: clarify compliance review outcomes"
```

### Task 9: Improve repurposing and recovery feedback

**Files:**
- Modify: `components/Library.tsx`
- Modify: `app/page.tsx`
- Modify: `components/CreationToolkit.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add a clear repurposing target selector**

Group targets by channel and show the source format beside the target.

- [ ] **Step 2: Add copy and return actions**

Keep the adapted draft visible, support copy confirmation and allow returning to the source without losing the result.

- [ ] **Step 3: Improve creation guide prompts**

Make pack prompts keyboard accessible and explain when a prompt adds context rather than a verified claim.

- [ ] **Step 4: Run the build and commit**

Run: `npm run build`

```bash
git add components/Library.tsx app/page.tsx components/CreationToolkit.tsx app/globals.css
git commit -m "feat: make repurposing actions clearer"
```

### Task 10: Add activity history and final verification

**Files:**
- Create: `components/ActivityHistory.tsx`
- Create: `app/api/activity/route.ts`
- Modify: `app/page.tsx`
- Modify: `app/api/approve/route.ts`
- Modify: `app/api/facts/route.ts`
- Modify: `app/api/knowledge/route.ts`
- Modify: `app/globals.css`

**Interfaces:**
- `POST /api/activity` accepts `{ action: string; entityType: string; entityId?: number | null; detail?: string }` and returns `{ ok: true }`.
- `GET /api/activity` returns `{ connected: boolean; entries: { id: number; action: string; entity_type: string; entity_id: number | null; detail: string | null; created_at: string }[] }`.

- [ ] **Step 1: Add an idempotent activity table**

Extend D1 schema creation with `activity_log` using SQLite-compatible types and `CREATE TABLE IF NOT EXISTS`; do not alter existing rows.

- [ ] **Step 2: Add activity route**

Validate action/entity values, write entries and return safe errors. Limit reads to the most recent 100 entries.

- [ ] **Step 3: Record meaningful actions**

Record fact edits, knowledge edits, approvals, retirements and repurposing. Do not record source text or secrets.

- [ ] **Step 4: Render recent history**

Add a compact timeline in Library/Review with safe date handling and an empty state.

- [ ] **Step 5: Run full verification**

Run: `npm run build` and test `GET /api/library`, `GET /api/knowledge?profession=gp`, `GET /api/activity`, generation, approval and repurposing endpoints.

- [ ] **Step 6: Commit and publish**

```bash
git add app components lib db drizzle docs/superpowers/plans/2026-09-17-omega-content-studio-improvements.md
git commit -m "feat: complete Omega content studio improvements"
```

Package the exact commit, save a Sites version, deploy it publicly, inspect deployment status, and verify the live URL on desktop and mobile widths.
