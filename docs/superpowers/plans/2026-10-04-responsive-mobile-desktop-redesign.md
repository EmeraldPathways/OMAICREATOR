# Responsive Mobile and Desktop Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a mobile-first responsive redesign of the complete Content Studio, including dropdown navigation for Review Desk and RankScope, then verify every view again on desktop.

**Architecture:** Preserve the existing shell, business components, API contracts, and same-origin embedded workspaces. Add one reusable React section-navigation component, an equivalent Review Desk hosted-UI control, layout-only iframe height synchronisation, and focused responsive CSS in the existing style sheets. Each navigation presentation shares the current view state so breakpoints never reset work.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS media queries, same-origin iframe messaging, Node test runner, ESLint, Vinext/Vite, Sites hosting.

**Spec:** `docs/superpowers/specs/2026-10-04-responsive-mobile-desktop-redesign-design.md`

## Global Constraints

- Use 760px as the mobile section-navigation breakpoint.
- Verify at 390 × 844, 360 × 800, 1440 × 900, and 1024 × 768 CSS pixels.
- Mobile interactive targets must be at least 44 × 44px.
- Mobile form controls must use at least 16px text.
- Preserve all existing brand isolation, authentication, API schemas, generated content, review data, and SEO data.
- Preserve the Review Desk-inspired navy, teal, cool-grey, and Inter visual system.
- Do not add a second source of truth for current view state.
- Do not introduce document-level horizontal scrolling.

## Review Focus

- Long labels and the longest business name must wrap or truncate without creating horizontal overflow; Task 2 and Task 6 add assertions and browser checks.
- Changing between mobile and desktop widths must preserve the active Review Desk or RankScope destination; Task 2 and Task 3 pin both controls to one state value.
- A missing or malformed iframe height message must be ignored and retain the safe fallback height; Task 4 tests message validation.
- Empty, loading, error, and disabled states must retain usable spacing and contrast; Task 6 and Task 7 include these states in the page matrix.
- Browser zoom and keyboard navigation must keep controls reachable with visible focus; Task 7 verifies 200 percent zoom, Tab order, Escape, and focus return.

---

### Task 1: Lock the responsive shell contract

**Files:**
- Modify: `tests/layoutAndNavigation.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `.shell`, `.sidebar`, `.topbar`, `.workspace`, `.column`, `.btn`, and form control classes.
- Produces: shared mobile sizing and reflow rules used by every later task.

- [ ] **Step 1: Add failing shell contract tests**

Add tests named `mobile shell exposes accessible drawer and touch-safe controls` and `responsive layouts prevent cramped desktop columns`. Assert that `app/page.tsx` contains the existing menu button with `aria-controls="studio-sidebar"`, and that `app/globals.css` contains mobile rules for a 44px button minimum, 16px form text, a single-column workspace, non-sticky ledger column, and a 1024–1100px compact-desktop breakpoint.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/layoutAndNavigation.test.ts`

Expected: FAIL because the complete responsive contract is not yet present.

- [ ] **Step 3: Implement the shared shell rules**

In `app/globals.css`, make the top bar, brand selector, account control, workspace columns, panel padding, action rows, forms, and sidebar drawer follow the spec. Keep `.btn` at 44px minimum height globally; apply 16px input/select/textarea text only below 760px; collapse the ledger into normal flow on compact widths.

- [ ] **Step 4: Run the focused tests**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/layoutAndNavigation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/layoutAndNavigation.test.ts app/globals.css
git commit -m "feat: establish responsive studio shell"
```

### Task 2: Add shared RankScope responsive section navigation

**Files:**
- Create: `components/ResponsiveSectionNav.tsx`
- Modify: `components/RankScopeWorkspace.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rankscopeMigration.test.ts`

**Interfaces:**
- Consumes: `items: readonly string[]`, `value: string`, `onChange(value: string): void`, `label: string`, and optional `className?: string`.
- Produces: `ResponsiveSectionNav` rendering desktop tab buttons and a mobile labelled native select backed by one `value`.

- [ ] **Step 1: Write failing component-source tests**

Add `RankScope offers tabs on desktop and a labelled select on mobile`. Assert that `ResponsiveSectionNav.tsx` renders both a `nav` and `select`, associates the select with a visible label, maps the same `items`, and calls the same `onChange`. Assert `RankScopeWorkspace.tsx` passes `RANKSCOPE_VIEWS`, `feature`, and `setFeature`.

- [ ] **Step 2: Run the RankScope tests and confirm failure**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/rankscopeMigration.test.ts`

Expected: FAIL because `ResponsiveSectionNav.tsx` does not exist.

- [ ] **Step 3: Implement `ResponsiveSectionNav`**

Export:

```ts
interface ResponsiveSectionNavProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}
```

Desktop buttons receive `aria-current="page"` when active. The mobile select uses a stable generated id and a visible label. Do not maintain internal selection state.

- [ ] **Step 4: Replace RankScope's handwritten tab row**

Use `ResponsiveSectionNav` in `components/RankScopeWorkspace.tsx`. Keep the current `feature` state and existing iframe `postMessage` effect unchanged. Add desktop wrapping and mobile show/hide rules in `app/globals.css`.

- [ ] **Step 5: Run focused tests, lint, and type-aware build**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/rankscopeMigration.test.ts && npm run lint && npm run build`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add components/ResponsiveSectionNav.tsx components/RankScopeWorkspace.tsx app/globals.css tests/rankscopeMigration.test.ts
git commit -m "feat: add responsive RankScope navigation"
```

### Task 3: Add Review Desk mobile destination dropdown

**Files:**
- Modify: `lib/reviewDesk/ui.js`
- Modify: `tests/reviewDeskRoutes.test.ts`

**Interfaces:**
- Consumes: existing Review Desk `view` variable, seven destination labels, and `render()`.
- Produces: `#mobileNav` select and existing `#nav` buttons updating the same `view` value.

- [ ] **Step 1: Write failing hosted-UI tests**

Add `Review Desk exposes the same destinations as tabs and a mobile select`. Assert that the generated HTML includes a visible `label` for `mobileNav`, a `select id="mobileNav"`, all seven destinations, a change handler that assigns `view`, and CSS that hides the select above 760px and hides tabs below 760px.

- [ ] **Step 2: Run the focused Review Desk tests and confirm failure**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/reviewDeskRoutes.test.ts`

Expected: FAIL because the mobile select is absent.

- [ ] **Step 3: Implement the shared Review Desk navigation state**

Define one `views` array in the hosted script. Render desktop buttons and mobile options from it. On button click or select change, assign `view` and call `render()`. Ensure rerendering marks the active desktop button and selected option without resetting filters or form state.

- [ ] **Step 4: Add mobile Review Desk layout rules**

Below 760px, show the labelled select, hide the tab row, stack the top header where needed, use two metric columns with a one-column fallback below 380px, and make action buttons touch-safe. Keep the existing 560px field and card rules, removing conflicts rather than duplicating them.

- [ ] **Step 5: Run Review Desk and full unit tests**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/reviewDeskRoutes.test.ts && npm run test:unit`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/reviewDesk/ui.js tests/reviewDeskRoutes.test.ts
git commit -m "feat: add mobile Review Desk navigation"
```

### Task 4: Eliminate embedded workspace double scrolling

**Files:**
- Create: `hooks/useEmbeddedFrameHeight.ts`
- Modify: `components/RankScopeWorkspace.tsx`
- Modify: `components/review-desk/ReviewDeskFrame.tsx`
- Modify: `app/rankscope/page.tsx`
- Modify: `lib/reviewDesk/ui.js`
- Modify: `app/globals.css`
- Create: `tests/embeddedFrameHeight.test.ts`

**Interfaces:**
- Consumes: messages shaped as `{ type: "studio:frame-height"; workspace: "rankscope" | "review-desk"; height: number }` from the same origin.
- Produces: `useEmbeddedFrameHeight(workspace): { frameRef: RefObject<HTMLIFrameElement | null>; height: number | null }` and bounded iframe style height.

- [ ] **Step 1: Write failing height-protocol tests**

Test the exported pure helper:

```ts
parseFrameHeightMessage(data: unknown, workspace: EmbeddedWorkspace): number | null
```

Assert that matching finite heights between 480 and 20000 are accepted, while the wrong workspace, strings, `NaN`, negative values, and oversized values return `null`. Add source assertions that both embedded documents post the exact message shape after render and resize.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/embeddedFrameHeight.test.ts`

Expected: FAIL because the hook and parser do not exist.

- [ ] **Step 3: Implement the parent hook**

Export `EmbeddedWorkspace`, `parseFrameHeightMessage`, and `useEmbeddedFrameHeight`. The hook must validate `event.origin === window.location.origin`, ignore invalid payloads, and remove its message listener on cleanup. It starts at `null` so existing CSS remains the fallback.

- [ ] **Step 4: Emit heights from both embedded workspaces**

In `app/rankscope/page.tsx`, start a `ResizeObserver` only when `embedded` is true and post the document height after view changes. In `lib/reviewDesk/ui.js`, post height after `render()` and on resize. Do not include content, account, or brand data in the message.

- [ ] **Step 5: Apply measured heights in both frame parents**

Use the hook in `RankScopeWorkspace` and `ReviewDeskFrame`. Set inline height only when a validated value exists; retain CSS minimums as the failure fallback. Remove frame-internal document scrolling where the measured-height path is active.

- [ ] **Step 6: Run focused and full regression tests**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/embeddedFrameHeight.test.ts && npm run test:unit && npm run lint`

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/useEmbeddedFrameHeight.ts components/RankScopeWorkspace.tsx components/review-desk/ReviewDeskFrame.tsx app/rankscope/page.tsx lib/reviewDesk/ui.js app/globals.css tests/embeddedFrameHeight.test.ts
git commit -m "fix: remove embedded workspace double scrolling"
```

### Task 5: Complete RankScope's mobile and desktop layout pass

**Files:**
- Modify: `app/rankscope/rankscope.css`
- Modify: `app/rankscope/page.tsx`
- Modify: `tests/rankscopeMigration.test.ts`

**Interfaces:**
- Consumes: existing RankScope component class names and `data-label` table attributes.
- Produces: responsive layouts for all thirteen RankScope destinations without changing their data contracts.

- [ ] **Step 1: Add failing responsive RankScope tests**

Assert that the CSS contains 760px rules for a stacked embedded top bar, 16px controls, touch-safe buttons, one-column analysis/writer/report layouts, responsive metrics, and labelled mobile table rows using `td::before { content: attr(data-label) }`. Assert that the 360px fallback reduces multi-column metric and link grids without hiding content.

- [ ] **Step 2: Run the RankScope tests and confirm failure**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/rankscopeMigration.test.ts`

Expected: FAIL on the missing complete mobile rules.

- [ ] **Step 3: Implement RankScope page-family rules**

Update `app/rankscope/rankscope.css` by page family: overview metrics/charts, analysis forms, tables, Topic Research, Writing Assistant, Content Briefs, Reports, Integrations, modals, and SEO chat. Remove fixed widths that exceed the viewport; preserve horizontal table scrolling only where stacked rows would lose meaning.

- [ ] **Step 4: Fix any markup that cannot reflow semantically**

In `app/rankscope/page.tsx`, add missing `data-label` attributes, wrappers, or accessible labels required by the responsive CSS. Do not change API requests, calculations, exports, or workspace persistence.

- [ ] **Step 5: Run RankScope tests, lint, and build**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/rankscopeMigration.test.ts && npm run lint && npm run build`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add app/rankscope/rankscope.css app/rankscope/page.tsx tests/rankscopeMigration.test.ts
git commit -m "fix: make every RankScope view responsive"
```

### Task 6: Complete the Content Studio and Image Studio page pass

**Files:**
- Modify: `app/globals.css`
- Modify only where semantic wrappers or labels are required: `components/*.tsx`
- Modify: `tests/layoutAndNavigation.test.ts`
- Modify: `tests/historyUi.test.ts`
- Modify: `tests/imageGeneration.test.ts`

**Interfaces:**
- Consumes: existing component markup and shared responsive shell contract from Task 1.
- Produces: consistent mobile and desktop presentation across all main Studio pages and all four brands.

- [ ] **Step 1: Add failing cross-page responsive tests**

Add assertions for single-column mobile grids, non-sticky ledger flow, full-width primary actions, History mobile channel select or wrapped tabs, Image Studio orientation/size control reflow, and long-label overflow protection using `min-width: 0`, `overflow-wrap`, or equivalent rules.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/layoutAndNavigation.test.ts && node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/historyUi.test.ts && node --experimental-strip-types --import ./tests/register-ts-loader.mjs tests/imageGeneration.test.ts`

Expected: FAIL on missing cross-page rules.

- [ ] **Step 3: Audit and fix each Studio view in source order**

Apply focused CSS or semantic markup fixes for:

1. Email, LinkedIn, Instagram, Website article, and Print article.
2. Advisor interview and Voice bank.
3. Campaigns, Review queue, History, and Activity.
4. Fact base, Library, Brand settings, Profession knowledge, Estate sweep, and Setup.
5. Image Studio generation controls, orientation/size choices, result cards, and history.
6. Login, loading, empty, error, disabled, and recovery states.

Keep cards content-sized, collapse grids at 760px, and retain desktop density at 1024px and above.

- [ ] **Step 4: Verify all four brand profiles in component state tests**

Extend existing tests only where necessary to assert that responsive markup is shared and no brand-specific page loses its available channels or settings.

- [ ] **Step 5: Run the complete automated suite**

Run: `npm run test:unit && npm run lint && npm run build`

Expected: all commands PASS with no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components tests
git commit -m "fix: complete responsive studio page layouts"
```

### Task 7: Perform the mobile-first browser audit and repair loop

**Files:**
- Create: `audit-2026-10-04/responsive-page-matrix.md`
- Modify: any files identified by the audit, limited to the scope in the spec.

**Interfaces:**
- Consumes: the completed local build and authenticated owner workspace.
- Produces: a numbered mobile audit record with pass/fail, visible issue, fix commit, and retest result for every scoped view.

- [ ] **Step 1: Start the verified development preview**

Run: `npm run dev`

Expected: the app serves successfully with no startup exception.

- [ ] **Step 2: Audit 390 × 844 and 360 × 800 one page at a time**

Record every main Studio view, seven Review Desk destinations, thirteen RankScope destinations, Image Studio, and Login in `audit-2026-10-04/responsive-page-matrix.md`. For each page capture: rendering, spacing, horizontal overflow, nested scrolling, touch targets, control wrapping, focus, empty/loading/error state, and console errors.

- [ ] **Step 3: Fix the first failing page only**

Write or extend the smallest automated test that proves the failure, run it red, apply the minimal fix, and run it green. Recheck that page and its immediately adjacent navigation destinations before moving on.

- [ ] **Step 4: Repeat Step 3 until every mobile page passes**

Expected: every mobile matrix row records `PASS` after retest; no unresolved visual defect remains.

- [ ] **Step 5: Verify mobile accessibility interactions**

At 390 × 844, test keyboard Tab order, visible focus, sidebar Escape handling and focus return, Review Desk and RankScope dropdown labels, 200 percent zoom, and long-label reflow.

- [ ] **Step 6: Commit the mobile audit fixes and matrix**

```bash
git add audit-2026-10-04 app components hooks lib tests
git commit -m "fix: resolve mobile responsive audit findings"
```

### Task 8: Perform the desktop audit, final regression, and publication

**Files:**
- Modify: `audit-2026-10-04/responsive-page-matrix.md`
- Modify: any files identified by the desktop audit, limited to the scope in the spec.

**Interfaces:**
- Consumes: mobile-approved implementation from Task 7.
- Produces: desktop-approved build, final automated verification, and published Sites version.

- [ ] **Step 1: Audit 1440 × 900 and 1024 × 768 one page at a time**

Repeat the full page matrix. Pay particular attention to top-bar alignment, sidebar collapse, ledger width, tab visibility, RankScope's second tab row, readable line length, data-table density, iframe height, and unexpected gaps introduced by mobile fixes.

- [ ] **Step 2: Fix and retest each failing desktop page**

For every failure, add the smallest regression test, confirm it fails, apply the fix, confirm it passes, and retest the affected page plus adjacent navigation destinations.

- [ ] **Step 3: Run final automated verification**

Run: `npm run test:unit && npm run lint && npm run build && git diff --check`

Expected: all tests PASS, lint exits 0, build exits 0, and `git diff --check` prints nothing.

- [ ] **Step 4: Inspect the final diff and commit desktop fixes**

Run: `git status --short && git diff --stat HEAD~1..HEAD && git log --oneline -12`

Then commit any remaining audited changes:

```bash
git add audit-2026-10-04 app components hooks lib tests
git commit -m "fix: resolve desktop responsive audit findings"
```

- [ ] **Step 5: Publish the verified branch to the existing Sites project**

Use the established Sites hosting workflow for project `appgprj_6aabe4af0f8c81918bb6100cceb98859`. Do not create a second site.

Expected: a new published version is active at `https://omega-content-studio.emeraldpathways.chatgpt.site`.

- [ ] **Step 6: Run the production smoke pass**

On the published URL, verify Login, one content channel, History, Image Studio, all Review Desk destinations, all RankScope destinations, mobile dropdown navigation, desktop tabs, brand switching, and browser console errors.

- [ ] **Step 7: Record the deployment and final results**

Append the Sites version, commit, deployment identifier, automated command results, mobile/desktop page counts, and any evidence limits to `audit-2026-10-04/responsive-page-matrix.md`.
