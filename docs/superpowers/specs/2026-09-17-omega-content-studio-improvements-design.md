# Omega Content Studio Improvements Design

## Goal

Make Omega Content Studio faster and clearer for an internal team creating, checking, approving and reusing Irish financial-services content.

## Users and assumptions

- Primary users are Omega staff creating professional content for GPs, dentists, medical consultants, pharmacists and other specialist professions.
- The application remains an internal content-production workspace; it is not a client-facing advice portal.
- Irish sources, current verification dates and required Omega regulatory wording remain mandatory.
- Existing Cloudflare D1 persistence and GPT-5.6 Luna configuration remain in place.

## Design

### 1. Guided content brief

The creation screen will present the brief in an intentional order: profession, channel, format, topic, audience, tone, source material and notes. Required fields will be visibly marked, progress will be shown, and the primary generate action will remain available without forcing users to scroll through unrelated controls.

### 2. Persistent draft workspace

The creation view will keep the brief, source selections, draft, audit result and revision controls in one coherent workspace. Draft state will be saved locally while the user works and restored after refresh. Existing API behaviour remains unchanged.

### 3. Content status system

Drafts will expose clear status labels: Draft, Needs review, Compliance review, Approved and Archived. Status labels will use consistent visual treatment and appear in the review queue, approved work and saved-content areas.

### 4. Knowledge and fact-base workspace

Profession knowledge and verified facts will gain search/filter controls, visible counts, review dates, expired-state warnings, inline editing and clear save confirmation. Knowledge entries will remain qualitative; numeric claims will remain in the verified fact base.

### 5. Source and expiry controls

Every stored fact or knowledge entry shown to the writer will expose its source and review window. Expired or unverifiable information will be visibly blocked or marked, with language that avoids guarantees about eligibility, acceptance or claims.

### 6. AI transparency

Generated drafts will show a compact “Used in this draft” evidence area listing relevant knowledge entries, verified figures and Irish research sources. This area will distinguish background knowledge from factual claims and will not expose secrets or internal runtime values.

### 7. Repurposing workflow

Approved work will support one clear action to choose a target channel and format, preview the adapted draft, copy it and return to the source. Missing information and dropped source content will remain explicit.

### 8. Compliance-first review panel

The review surface will group findings into blocking issues, changes required and passed checks. It will highlight unsupported claims, expired facts, missing disclaimers and missing mandatory Omega footer text beside the draft.

### 9. Responsive and accessible UI

The sidebar will remain scrollbar-free, navigation will work at mobile widths, primary actions will remain reachable, and panels will collapse where appropriate. Controls will have labels, keyboard focus states, readable contrast and non-colour status cues.

### 10. Autosave, recovery and activity history

The app will autosave the active brief and draft locally, provide recovery after an interrupted session, and show a concise history for meaningful actions such as edits, approvals, retirements and repurposing.

## Architecture

- Keep route-level orchestration in `app/page.tsx` while extracting repeated creation/review UI into focused components where a change would otherwise increase coupling.
- Keep D1 access in route handlers and shared database helpers; use explicit, idempotent SQL compatible with SQLite/D1.
- Keep content-pack and compliance rules in `lib/` modules, separate from presentation components.
- Prefer existing CSS tokens and components over adding a second design system.
- Preserve the public Site and existing feature behaviour while adding improvements incrementally.

## Error handling

- API failures show an actionable inline message and preserve unsaved local input.
- Long-running AI actions show progress and prevent duplicate submissions.
- Empty, loading, expired and disconnected database states each have a distinct explanation and next action.
- Invalid or stale dates never crash rendering; they display a safe fallback.
- No feature treats missing AI, search or vector services as permission to invent facts.

## Success criteria

- A new user can identify the next required creation action without reading instructions.
- A brief and draft survive a page refresh on the same browser.
- A user can find, edit, save and verify a fact or knowledge entry without leaving its tab.
- An approved piece can be repurposed with visible source/target context.
- The required Omega footer remains present in client-facing outputs.
- The core creation, knowledge, library, review and approval routes build successfully and return usable states on desktop and mobile widths.
- Existing D1 records remain readable and no destructive reset is introduced.
