# Unified visual system and content history

## Status

Design specification approved in conversation on 3 October 2026. The implementation must preserve the existing Content Studio workflows, Review Desk local embed, RankScope workspace, brand isolation, and owner-only access controls.

## Intent and success criteria

Content Studio currently combines an Omega-branded shell with Review Desk and RankScope workspaces that use different visual languages. The goal is one calm, professional shell based on Review Desk's typography, spacing, surfaces, and interaction patterns while retaining meaningful product colour in RankScope.

The Manage area also needs a durable, easy-to-scan history of saved content. A user should be able to open History, choose one of five channels, find the latest saved pieces for the active brand, inspect the full approved or in-review copy, and copy it without leaving the app.

Success means:

- Shared Content Studio routes use the same Inter/system font stack, cool-grey canvas, navy navigation, teal primary action, restrained borders, readable density, and consistent focus/disabled/error states.
- RankScope remains visually distinctive and its semantic SEO colours are not overwritten by global tokens.
- Image Studio appears in the Connected workspaces sidebar group beside Review Desk and RankScope, with the existing owner-access gate intact.
- Manage contains a History entry. History has fixed Email, LinkedIn, Instagram, Web Article, and Print Article tabs, is brand-scoped, and shows newest saved pieces first.
- History includes every persisted content piece already represented by `pieces`, including `in_review` and `approved` records. Unsaved local drafts remain local until the existing save/approval action persists them.
- Existing generation, approval, queue, library, image, Review Desk, and RankScope flows continue to work.
- Unit tests, lint, production build, desktop/mobile browser smoke tests, and live deployment checks pass.

## Design direction

### Shared visual language

Use Review Desk as the source of truth for the shared shell:

- Font: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.
- Canvas: cool grey around `#eff3f7`; elevated surfaces white; borders around `#d8e1ea`.
- Navigation/header: deep navy around `#122c3d` with high-contrast text.
- Primary action: teal around `#087d98`; hover state a darker teal; links use the same family.
- Controls: approximately 45px minimum height, 9px radius, 10–12px internal padding, visible focus ring.
- Cards/panels: 14px radius, 1px border, very light navy-tinted shadow, 16–24px internal spacing.
- Spacing scale: 8, 12, 16, 24, and 32px, with responsive reduction on small screens.
- Text hierarchy: 14–16px body text, 12–13px metadata, sentence-case headings, restrained letter spacing.

Map the existing global variables and shared selectors to these values instead of rewriting feature logic. Keep semantic success, warning, and failure colours distinct. The Review Desk iframe already uses this system; the outer shell should visually lead into it.

### RankScope isolation

Keep RankScope's scoped CSS variables and coral/mint/yellow SEO accents. Do not replace its product palette with the shared teal palette. Global changes must not reintroduce the existing `.workspace` grid collision; the RankScope root keeps its scoped block layout and embedded navigation overrides.

### Sidebar information architecture

The sidebar remains grouped as:

- Write for: channel shortcuts.
- Craft: Omega-only interview and voice tools.
- Manage: Campaigns, Review queue, History, Activity.
- Reference: Fact base, Library, Brand settings, Profession knowledge, Estate sweep, Setup.
- Connected workspaces: Image Studio, Review Desk, RankScope.

Image Studio moves from Reference into Connected workspaces. It keeps the current `ownerAccess` disabled state and explanatory text when access is unavailable. History is a normal Manage navigation item and remains available through the existing brand-access session.

### History experience

Add a dedicated `History` view and component rather than overloading the existing Reference Library. The view is a focused archive for created content; Library keeps its current packs, facts, lessons, findings, and repurposing responsibilities.

The page contains:

1. A short heading and active brand context.
2. Five horizontally scrollable tabs with exact labels: `Email`, `LinkedIn`, `Instagram`, `Web Article`, and `Print Article`.
3. A compact count/status row for the active channel.
4. A list of newest-first history cards. Each card shows topic/title, format, profession or audience, status (`in review`/`approved`), approval date, approver, edited indicator, and a readable content excerpt.
5. An expand/collapse affordance for the full saved text and a copy action with a non-blocking success message. Copy must be keyboard accessible and report failures clearly.
6. A useful empty state that identifies the selected channel and points to the corresponding Write for workflow.

On narrow screens the tabs scroll horizontally without causing page overflow, cards stack, metadata wraps, and actions remain reachable. The active tab has a visible selected state, not colour alone.

### Data and API boundaries

The existing `pieces` table is the source of truth; no duplicate history table is needed. Add `GET /api/history` with the same `authorizeBrandAccess` guard used by other brand-scoped routes. It accepts `brandId` and an optional channel filter, validates channel values, and returns only the active brand's non-retired pieces. The response includes only fields needed by History (`id`, `channel`, `format`, `profession`, `topic`, `final_text`, `was_edited`, `status`, `approved_by`, `approved_at`, `verdict`), ordered by `approved_at DESC` with a safe upper bound.

The channel mapping is explicit: `website` is presented as `Web Article`; `print` is presented as `Print Article`. The API preserves the stored IDs so existing data and brand profiles remain compatible. Errors use the app's existing JSON error pattern and do not disclose another brand's records.

### State and navigation integration

Add `history` to `VIEW_TITLES`, the sidebar selection union-by-convention, and the main page render switch. Selecting History must close the mobile nav using the existing selection helper and retain the current brand. Switching brands while History is open reloads data for the new brand and resets the active tab to Email (or the first available tab only if a future profile explicitly removes Email; the five requested tabs remain rendered).

## Files and boundaries

Expected implementation areas:

- `app/globals.css`: shared tokens, shell, controls, cards, navigation, and responsive spacing.
- `components/Sidebar.tsx`: History item and Image Studio grouping.
- `app/page.tsx`: History view title/rendering and navigation integration.
- `components/History.tsx`: tabbed, brand-scoped archive UI.
- `app/api/history/route.ts`: authorized history query.
- `tests/history.test.ts` and/or existing route/brand-isolation tests: response filtering, channel mapping, and UI contract checks.
- Any narrowly scoped shared CSS additions required for History.

Do not change the Review Desk iframe data model, RankScope feature logic, or image-generation API unless a test demonstrates a regression caused by the shared shell update.

## Accessibility and failure handling

- Use real buttons for tabs and actions with `aria-selected`, `role="tablist"`, and labelled controls.
- Preserve visible `:focus-visible` treatment and at least 44px touch targets.
- Use live-region feedback for copy success/failure and data errors.
- Show loading skeleton or concise loading text while history fetches.
- Handle no database, authorization failure, malformed channel, empty channel, and clipboard-unavailable cases without blank screens.
- Do not expose full content from another brand or from retired pieces.

## Verification plan

### Automated

- Add unit coverage for the History route's brand and retired-row filtering, valid channel filtering, invalid-channel rejection, ordering, and response shape.
- Add a UI contract test for the five tab labels, History navigation entry, Image Studio grouping, and shared visual-token markers.
- Run the complete existing unit suite, lint, and production build.

### Browser

At desktop and mobile widths:

- Sign in and open the main Content Studio shell.
- Confirm the shared font, navy sidebar, cool-grey canvas, consistent cards/forms/buttons, and visible focus states.
- Open each Manage item, including History; switch all five History tabs, expand/collapse a record, copy a record, and verify empty/loading/error states.
- Switch brands and confirm History and Image Studio remain correctly gated and brand-scoped.
- Open Image Studio, Review Desk, and every RankScope view; check no horizontal overflow, clipping, or navigation regressions.
- Exercise the existing draft, approval, Library, Campaigns, Review queue, and Activity flows.
- Repeat after any fixes, then verify the public deployed URL after publishing.

## Non-goals

- No new authentication provider or change to the existing email/password access model.
- No remote iframe or original-project dependency for Review Desk or RankScope.
- No automatic persistence of unsaved browser drafts merely for History.
- No redesign of RankScope's internal product palette.
- No unrelated SEO, review automation, or image-generation feature changes.
