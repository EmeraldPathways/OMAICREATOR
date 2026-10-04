# Unified visual system and content history Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Content Studio shell use Review Desk's coherent visual system, move Image Studio beside the connected workspaces, and add a brand-scoped Manage → History archive with five channel tabs.

**Architecture:** Keep the existing React shell and D1 `pieces` archive. Update shared CSS tokens/selectors and sidebar composition without changing feature logic; expose a small authorized History route over `pieces`, and render it through a focused client component. RankScope remains isolated behind its scoped CSS, and Review Desk remains the local same-origin embedded workspace.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Cloudflare D1 via the existing SQL helper, CSS in `app/globals.css`, Node `node:test`, Sites workflow, CUA browser smoke tests.

**Spec:** `docs/superpowers/specs/2026-10-03-unified-visual-system-history-design.md`

## Global Constraints

- Use Review Desk's Inter/system font stack, cool-grey canvas, navy navigation, teal primary action, 9px controls, 14px cards, and 8/12/16/24/32px spacing.
- Keep RankScope's scoped coral/mint/yellow SEO palette and embedded-layout overrides.
- Keep Image Studio owner-only and brand-scoped.
- History uses persisted non-retired `pieces`, includes `in_review` and `approved`, and does not persist unsaved browser drafts.
- History tabs are exactly Email, LinkedIn, Instagram, Web Article, and Print Article; stored channel IDs remain `email`, `linkedin`, `instagram`, `website`, and `print`.
- Do not add dependencies or change Review Desk/RankScope/image-generation feature logic unless a regression requires a narrowly scoped fix.
- Every database/API query must remain brand-isolated through `authorizeBrandAccess`.

## Review Focus

- A request for another brand's History must return only the selected authenticated brand's pieces — pin this in the History route test.
- A retired piece must never appear, even when its channel matches — pin this in the History route test.
- `website` and `print` must display the requested tab labels while preserving their stored IDs — pin this in the History UI contract test.
- The global `.workspace` rule must not break embedded RankScope again — retain the existing RankScope regression test and add token assertions without broad selectors.
- Five tabs must remain usable on narrow screens without horizontal page overflow — pin this in the History component contract and browser verification.

---

### Task 1: Apply the shared Review Desk visual system and reorganise navigation

**Files:**
- Modify: `app/globals.css`
- Modify: `components/Sidebar.tsx`
- Modify: `app/page.tsx` (only `VIEW_TITLES`/view plumbing needed for the new navigation entry)
- Test: `tests/layoutAndNavigation.test.ts`

**Interfaces:**
- Consumes: Existing global selectors, `Sidebar` props, and the current `view`/`onSelect` contract.
- Produces: Shared visual tokens/selectors, a Manage History navigation item, and Connected workspaces order `Image Studio`, `Review Desk`, `RankScope`.

- [ ] **Step 1: Write failing layout/navigation contract tests**

  Read `app/globals.css` and `components/Sidebar.tsx` as text and assert:

  - the global font stack contains `Inter` and `system-ui`;
  - the shared tokens include `#122c3d`, `#087d98`, `#eff3f7`, and `#d8e1ea`;
  - `History` is rendered in the Manage section;
  - the connected-workspaces block contains Image Studio before Review Desk and RankScope;
  - the old Image Studio button is not still present in the Reference section.

- [ ] **Step 2: Run the focused test and confirm it fails**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/layoutAndNavigation.test.ts`

  Expected: FAIL on at least the new token and ordering assertions.

- [ ] **Step 3: Update shared tokens and selectors in `app/globals.css`**

  Map the existing Omega shell variables to the approved Review Desk values, set the font stack, update body/canvas/sidebar/topbar/card/panel/form/button/focus styles to the spacing and radius scale, and preserve separate semantic pass/warn/fail variables. Keep mobile breakpoints and scoped RankScope overrides intact.

- [ ] **Step 4: Move Image Studio and add History in `components/Sidebar.tsx`**

  Remove the Image Studio button from Reference, add a normal History button after Review queue in Manage, and add Image Studio as the first button in `sidebar-workspaces`. Preserve current labels, icons, `ownerAccess` disabling, `aria-current`, and collapsed tooltips.

- [ ] **Step 5: Add the `history` title/view plumbing in `app/page.tsx`**

  Add `history: "History"` to `VIEW_TITLES` and ensure `selectChannel`/mobile navigation accepts the new view without changing existing channel behavior.

- [ ] **Step 6: Run the focused test and the existing RankScope migration test**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/layoutAndNavigation.test.ts tests/rankscopeMigration.test.ts`

  Expected: PASS with no selector collision assertions failing.

- [ ] **Step 7: Commit the shell/navigation change**

  ```bash
  git add app/globals.css components/Sidebar.tsx app/page.tsx tests/layoutAndNavigation.test.ts
  git commit -m "feat: align shell styling and workspace navigation"
  ```

### Task 2: Add the brand-scoped History API

**Files:**
- Create: `app/api/history/route.ts`
- Test: `tests/historyRoute.test.ts`

**Interfaces:**
- Consumes: `authorizeBrandAccess`, `db`, `hasDb`, and the `pieces` table.
- Produces: `GET /api/history?brandId=<id>&channel=<optional>` returning `{ connected, pieces }` with the exact History fields.

- [ ] **Step 1: Write failing route contract tests**

  Test a source-level route contract and a fake SQL adapter where practical. Assert that the route:

  - accepts only `email`, `linkedin`, `instagram`, `website`, and `print`;
  - rejects an invalid channel with HTTP 400;
  - filters by the authorized brand and `retired_at IS NULL`;
  - orders by `approved_at DESC` and applies a bounded limit;
  - returns `id`, `channel`, `format`, `profession`, `topic`, `final_text`, `was_edited`, `status`, `approved_by`, `approved_at`, and `verdict`;
  - does not return unrelated library/fact data.

- [ ] **Step 2: Run the focused route test and confirm it fails**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/historyRoute.test.ts`

  Expected: FAIL because `app/api/history/route.ts` does not exist.

- [ ] **Step 3: Implement `GET` in `app/api/history/route.ts`**

  Authorize `brandId`, return the existing `{ connected: false, pieces: [] }` shape when D1 is unavailable, validate an optional channel query, query only the active brand's non-retired rows with a safe limit (100), and normalize database errors to the app's JSON error shape. Keep `runtime = "nodejs"` and `maxDuration = 30` consistent with the library route.

- [ ] **Step 4: Run the focused route tests**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/historyRoute.test.ts`

  Expected: PASS for validation, isolation, ordering, response shape, and no-DB behavior.

- [ ] **Step 5: Commit the API change**

  ```bash
  git add app/api/history/route.ts tests/historyRoute.test.ts
  git commit -m "feat: add brand-scoped content history API"
  ```

### Task 3: Build the History view with five tabs

**Files:**
- Create: `components/History.tsx`
- Modify: `app/globals.css` (History-specific layout only)
- Test: `tests/historyUi.test.ts`

**Interfaces:**
- Consumes: `History` props `{ brandId: string; brandName: string; onCreate: (channel: string) => void }` and `GET /api/history`.
- Produces: Accessible five-tab archive with loading, empty, error, expand/collapse, and copy states.

- [ ] **Step 1: Write failing History UI contract tests**

  Read the component source and assert the exact five tab labels/IDs, `role="tablist"`, `aria-selected`, `website` → `Web Article`, `print` → `Print Article`, full-text expansion affordance, clipboard feedback, and empty/error copy.

- [ ] **Step 2: Run the focused UI test and confirm it fails**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/historyUi.test.ts`

  Expected: FAIL because `components/History.tsx` does not exist.

- [ ] **Step 3: Implement the History component**

  Use a fixed `HISTORY_TABS` array with `{ id, label }`, default to Email, fetch `/api/history?brandId=...&channel=...` when brand or tab changes, keep the five tabs visible even when empty, render newest-first cards from the API, and use `<details>` or equivalent state for full text. Use `navigator.clipboard.writeText` with a fallback error message, a live region, and keyboard-accessible buttons. The create action should call `onCreate(tab.id)` so the parent can take the user to the matching composer.

- [ ] **Step 4: Add focused History layout styles**

  Add scoped classes for the heading, tab strip, active/hover/focus states, cards, metadata, body preview/full text, action row, loading, empty, and error states. Use the shared tokens and ensure the tab strip is scrollable without creating body overflow at mobile widths.

- [ ] **Step 5: Run the focused UI test**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/historyUi.test.ts`

  Expected: PASS for all labels, accessibility hooks, channel mapping, and state copy.

- [ ] **Step 6: Commit the History component**

  ```bash
  git add components/History.tsx app/globals.css tests/historyUi.test.ts
  git commit -m "feat: add tabbed content history view"
  ```

### Task 4: Integrate History into the Content Studio shell

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/History.tsx` only if integration types require it
- Test: `tests/historyIntegration.test.ts`

**Interfaces:**
- Consumes: `History` component and the existing `selectChannel`, `brandId`, `profile`, and `ownerAccess` state.
- Produces: A working Manage → History route that opens the matching composer from an empty state and preserves brand switching/mobile navigation.

- [ ] **Step 1: Write failing integration contract tests**

  Assert that `app/page.tsx` imports/renders `History`, passes the current brand, includes the `history` view branch, and routes the History create callback to the selected content channel. Assert existing Image Studio, Review Desk, and RankScope branches remain present.

- [ ] **Step 2: Run the focused integration test and confirm it fails**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/historyIntegration.test.ts`

  Expected: FAIL until the view is rendered by the parent.

- [ ] **Step 3: Render History in `app/page.tsx`**

  Import `History`, render it when `view === "history"`, pass `brandId` and `profile.name`, and implement `onCreate` by setting the requested channel view plus its first format. Keep owner gating consistent with existing content-management views.

- [ ] **Step 4: Run integration and full unit tests**

  Run: `node --experimental-strip-types --import ./tests/register-ts-loader.mjs --test tests/historyIntegration.test.ts` and then `npm run test:unit`.

  Expected: PASS for integration and the complete suite.

- [ ] **Step 5: Commit the integration**

  ```bash
  git add app/page.tsx components/History.tsx tests/historyIntegration.test.ts
  git commit -m "feat: connect content history to the studio shell"
  ```

### Task 5: Full verification, browser fixes, and deployment

**Files:**
- Modify: only files needed to fix verified failures from Tasks 1–4.
- Test: existing test suite plus browser smoke checks.

**Interfaces:**
- Consumes: the completed shell, History API, History view, and all existing routes.
- Produces: a verified branch and deployed public Site version.

- [ ] **Step 1: Run the complete automated checks**

  Run `npm run test:unit`, `npm run lint`, and `npm run build`. Record and fix any failures before browser testing.

- [ ] **Step 2: Start the local production preview and test desktop UX**

  Use the existing Sites workflow/local preview. Sign in, inspect the shell font/spacing/colours, visit every sidebar item, open all five History tabs, expand/copy a card, switch brands, and exercise Image Studio, Review Desk, and all RankScope views. Check console errors, clipped content, broken focus states, and horizontal overflow.

- [ ] **Step 3: Test mobile UX and fix regressions**

  Repeat at a narrow viewport. Verify the mobile menu/scrim, scrollable History tabs, touch-target sizes, card wrapping, Image Studio grouping, and RankScope embedded layout. Apply only targeted fixes, then repeat the relevant browser checks.

- [ ] **Step 4: Rerun automated checks after fixes**

  Run `npm run test:unit`, `npm run lint`, and `npm run build` again. Expected: all pass.

- [ ] **Step 5: Publish and smoke-test the public Site**

  Use the Sites source workflow to save and deploy a new version from this branch. Verify the public URL in desktop and mobile browser contexts, including sign-in, History tabs, Image Studio, Review Desk, and RankScope. Do not change the public audience setting.

- [ ] **Step 6: Commit any final fixes and report evidence**

  ```bash
  git add <verified-fix-files>
  git commit -m "fix: polish unified shell and history verification issues"
  ```

  Record the final commit, deployed version, automated test results, and browser smoke results.
