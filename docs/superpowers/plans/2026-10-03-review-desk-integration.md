# Review Desk Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Google Business Profile Review Desk into Content Studio as a protected, brand-scoped sidebar workspace.

**Architecture:** Vendor the existing hosted Review Desk Worker logic and adapt its data layer to `rd_` D1 tables scoped by the active Content Studio brand. Serve its existing UI and API through same-origin protected Next.js routes, reusing the validated Content Studio owner session, secrets, D1, and OpenAI configuration.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Cloudflare Workers runtime, D1 SQLite, existing Node unit test harness, Sites browser preview.

**Spec:** `docs/superpowers/specs/2026-10-03-review-desk-integration-design.md`

## Global Constraints

- All interactive routes require the existing Content Studio owner session.
- Review Desk settings and records are scoped to the four known brand IDs.
- All new D1 tables use `rd_` prefixes and schema creation is idempotent.
- Automatic publishing starts off and requires express user consent.
- Sensitive and complaint reviews remain manual-review only.
- OAuth refresh tokens are encrypted server-side; OAuth state uses PKCE, short expiry, and one-time use.
- Review cache and audit data follow the upstream 30-day retention behavior.
- Do not create another Site or change the existing Content Studio/RankScope products.

## Review Focus

- Unknown, missing, or malformed brand ID must fail closed before a query or mutation.
- A Google location linked to more than one brand must not make a Pub/Sub push ambiguous or cross-write reviews.
- OAuth callback with invalid, expired, replayed, wrong-owner, or wrong-brand state must not store a token.
- Google updates to a review with a saved draft must preserve the draft and mark the record for re-review.
- A publishing attempt after an external reply, review edit, consent removal, closed hours, or daily cap must not send a reply.

---

## File Structure

- `lib/reviewDesk/`: vendored upstream review workflow modules and generated UI HTML, with all persistence methods brand-scoped.
- `lib/reviewDesk/schema.ts`: idempotent D1 schema statements and brand validation.
- `lib/reviewDesk/runtime.ts`: adapter that builds the Review Desk environment from Content Studio runtime bindings and validated request identity.
- `app/api/review-desk/[...path]/route.ts`: same-origin UI/API/OAuth callback adapter with an explicit route/method allowlist.
- `app/api/review-desk/webhooks/pubsub/route.ts`: exact public webhook exception; cryptographic verification stays in the upstream handler.
- `components/review-desk/ReviewDeskFrame.tsx`: Content Studio Review Desk shell and brand-aware responsive frame.
- `components/Sidebar.tsx`, `app/page.tsx`: sidebar entry, active brand propagation, and workspace layout.
- `proxy.ts`: one exact POST webhook exception, leaving all other Review Desk routes behind normal owner-session validation.
- `lib/schemaSql.ts`, `lib/db.ts`: apply Review Desk schema during established D1 initialization.
- `tests/reviewDesk*.test.ts`: storage, auth/adapter, brand isolation, and workflow regression coverage.
- `tests/run-tests.mjs`: register new tests with the existing test harness.

## Task 1: Vendor workflow core and add brand-scoped Review Desk schema

**Files:**
- Create: `lib/reviewDesk/core.js`, `lib/reviewDesk/data.js`, `lib/reviewDesk/security.js`, `lib/reviewDesk/providers.js`, `lib/reviewDesk/schema.ts`
- Modify: `lib/schemaSql.ts`, `lib/db.ts`, `tests/run-tests.mjs`
- Test: `tests/reviewDeskSchema.test.ts`, `tests/reviewDeskBrandIsolation.test.ts`

**Interfaces:**
- Produces `isReviewDeskBrandId(value: unknown): value is BrandId` using `isBrandId` from `lib/brandProfiles.ts`.
- Produces `REVIEW_DESK_SCHEMA: string[]` with `rd_` table names and `brand_id` on settings, tokens, locations, reviews, examples, audit events, OAuth states, and daily budgets.
- Produces data functions whose first business-data argument is `{ brandId: BrandId }`, including `loadSettings`, `putSettings`, `listReviews`, `getReview`, `ingest`, `saveDraft`, `learn`, `audit`, and `purge`.
- OAuth state binds `brandId` and `ownerEmail`; no Review Desk-specific login session is used.

- [ ] **Step 1: Write failing schema and brand-boundary tests** asserting all Review Desk tables start with `rd_`, each business-data table has a `brand_id` column, unknown brand IDs are rejected, and identical Google review IDs can exist independently for two brands.
- [ ] **Step 2: Run tests to verify failure** with `npm run test:unit`; expected failure: Review Desk schema/data modules do not exist.
- [ ] **Step 3: Vendor upstream core/data/security/provider modules** and refactor each SQL operation to include the validated brand scope; use composite keys where upstream used a global review/location/example key. Reject ambiguous Pub/Sub location ownership.
- [ ] **Step 4: Add idempotent Review Desk schema initialization** in `lib/reviewDesk/schema.ts` and include it in `initSchema()` using the existing D1 initialization path.
- [ ] **Step 5: Run tests to verify pass** with `npm run test:unit`; expected: schema and brand-isolation cases pass and existing tests remain green.
- [ ] **Step 6: Commit** as `feat: add brand-scoped review desk storage`.

## Task 2: Adapt the upstream Worker to Content Studio request/runtime boundaries

**Files:**
- Create: `lib/reviewDesk/worker.js`, `lib/reviewDesk/runtime.ts`
- Modify: `lib/reviewDesk/providers.js`, `lib/reviewDesk/security.js`, `lib/reviewDesk/ui.js`
- Test: `tests/reviewDeskAdapter.test.ts`, `tests/reviewDeskWorkflow.test.ts`

**Interfaces:**
- Produces `createReviewDeskEnv({ brandId, ownerEmail, request, db, vars })`, returning the D1 binding, Content Studio owner identity, validated `PUBLIC_BASE_URL`, encryption secret, Google configuration, and existing OpenAI configuration.
- Worker handler accepts the validated brand and owner context from the adapter; it never reads identity or brand from an untrusted forwarded owner header.
- Keeps upstream worker actions for state, OAuth start/callback, settings, sample, discover, sync, notifications, disconnect, location, examples, draft, save, approve, publish, and simulate. Exposes a `scheduled` handler that runs purge, sync, and the existing automation tick for each configured brand.

- [ ] **Step 1: Write failing adapter/workflow tests** asserting route context provides the validated brand/owner, no second password/session is needed, missing OAuth/encryption settings disable connection cleanly, and upstream consent/risk/publish guards remain active.
- [ ] **Step 2: Run tests to verify failure** with `npm run test:unit`; expected failure: adapter and hosted workflow integration are missing.
- [ ] **Step 3: Port the upstream Worker handler and generated UI** to call the brand-scoped data methods and Content Studio runtime adapter; remove standalone login/logout behavior; map browser requests under `/api/review-desk/`; use the stable `/api/review-desk/oauth/callback` URI, resolving its brand from one-time state bound to the signed-in owner.
- [ ] **Step 4: Add safe configuration status and error handling** for missing Google client/API setup while keeping secrets server-only and logs free of review text/token values.
- [ ] **Step 5: Run tests to verify pass** with `npm run test:unit`; expected: workflow tests prove consent-off default, sensitive-review blocks, sync draft preservation, publish re-read guards, hours/limit checks, and purge.
- [ ] **Step 6: Commit** as `feat: adapt review desk worker to studio runtime`.

## Task 3: Add protected same-origin UI/API/OAuth routes and webhook boundary

**Files:**
- Create: `app/api/review-desk/[...path]/route.ts`, `app/api/review-desk/webhooks/pubsub/route.ts`
- Modify: `proxy.ts`, `tests/run-tests.mjs`
- Test: `tests/reviewDeskRoutes.test.ts`, `tests/reviewDeskAuth.test.ts`

**Interfaces:**
- Catch-all adapter dispatches only documented paths and methods; interactive requests use the session-derived `x-studio-owner-email` supplied by the proxy after verification and a validated `brandId` query parameter. The OAuth callback resolves its brand from the one-time state row bound to that same owner.
- UI path serves the Worker UI only after owner authentication. API paths preserve response content type, status, and no-store behavior.
- Webhook path accepts only POST, passes the original request to signed JWT verification, and is the sole auth-proxy exception.

- [ ] **Step 1: Write failing route/auth tests** for unauthenticated UI/API/OAuth denial, disallowed path/method denial, origin rejection, valid owner access, exact webhook exception, and Pub/Sub JWT failure before data writes.
- [ ] **Step 2: Run tests to verify failure** with `npm run test:unit`; expected failure: Review Desk routes do not exist.
- [ ] **Step 3: Add route adapter and webhook route** with strict path/method mapping and validated brand/owner runtime construction.
- [ ] **Step 4: Add exact webhook exception to the proxy** for only `POST /api/review-desk/webhooks/pubsub`; preserve existing auth behavior for all other requests.
- [ ] **Step 5: Run tests to verify pass** with `npm run test:unit`; expected: all adapter/auth boundary cases pass.
- [ ] **Step 6: Commit** as `feat: protect review desk routes with studio auth`.

## Task 4: Integrate Review Desk UI with sidebar and active brand

**Files:**
- Create: `components/review-desk/ReviewDeskFrame.tsx`
- Modify: `components/Sidebar.tsx`, `app/page.tsx`, app workspace styles
- Test: browser navigation checks during Task 5 (the repo's unit harness does not include a React DOM test runner).

**Interfaces:**
- Sidebar selects `view === "review-desk"` and marks the new item active in a distinct bottom section.
- `ReviewDeskFrame` receives `brandId`, `brandName`, and `ownerAccess`; it embeds only the protected same-origin Review Desk UI and resizes for narrow screens.
- Changing Content Studio brand reloads the frame with the validated active brand; switching back restores the prior workspace state.

- [ ] **Step 1: Add bottom sidebar area and brand-aware workspace frame** with accessible labels, owner-only navigation, active state, brand-specific frame URL, responsive full-height layout, loading state, and a clear missing-configuration state.
- [ ] **Step 2: Run `npm run lint`** and resolve lint/type issues.
- [ ] **Step 3: Commit** as `feat: add review desk workspace navigation`.

## Task 5: Full regression, browser QA, and existing Site deployment

**Files:**
- Modify only fixes discovered in Tasks 1–4.
- Test: all `tests/reviewDesk*.test.ts`, full project test suite, production build, desktop/mobile browser sessions.

**Interfaces:**
- No new public interfaces. Deployment targets the existing Content Studio Site project and keeps its public access plus owner login unchanged.

- [ ] **Step 1: Run full unit suite** using `npm run test:unit`; expected: all tests pass.
- [ ] **Step 2: Run lint and production build** using `npm run lint` and `npm run build`; expected: both exit successfully without warnings/errors caused by this feature.
- [ ] **Step 3: Run browser QA at desktop and mobile widths** for owner login, Review Desk entry, each brand selection, empty/unconfigured/configured/error states, all in-app Review Desk tabs, sidebar collapse, back navigation, and existing RankScope plus core Content Studio workflows.
- [ ] **Step 4: Fix every observed UI/UX or runtime failure** and repeat the affected tests, then repeat the full unit suite, lint/build, and desktop/mobile browser pass.
- [ ] **Step 5: Verify Google API and Site schedule configuration** without printing secrets; confirm OAuth callback URI and configure the existing Site Worker to invoke the Review Desk `scheduled` handler every five minutes. If provider credentials or Google API approval are absent, leave the feature in clear setup mode and report the exact required configuration.
- [ ] **Step 6: Publish to the existing Content Studio Site** only after automated and browser checks pass; verify the published Review Desk route and unaffected sign-in/RankScope paths.
- [ ] **Step 7: Commit** final fixes as `test: verify integrated review desk experience`.
