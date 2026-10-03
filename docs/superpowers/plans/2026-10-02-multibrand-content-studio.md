# Multi-brand Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Omega Content Studio into a brand-separated writing, campaign, and image workspace for Omega Financial, Graduation Hoodies, Eco Car Wash, and Bonner of Ireland.

**Architecture:** Keep the existing Next.js/Vinext app and D1 data model. Add explicit brand profiles and brand IDs, reuse the existing campaign and copy workflows with brand-specific prompt context, and add Image Studio with server-side generation plus D1 metadata and private R2 files. Preserve the public Site audience while owner-gating the new brand and image features on the server.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vinext, Cloudflare Workers, D1/SQLite, Drizzle migrations, R2, OpenAI Images API, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-02-multibrand-content-studio-design.md`

## Global Constraints

- Preserve the current Omega workflow, records, settings, and public Site access.
- Omega Financial remains the default profile; legacy records map to `omega-financial` without altering their content.
- Keep facts, voice, claims, logos, and prompt context scoped to the selected brand.
- Owner-check all new non-Omega reads and writes, brand settings, Image Studio requests, image history, and asset delivery on the server.
- Keep OpenAI credentials out of browser code and responses.
- Store structured state in D1 and generated/image bytes in R2; do not put image bytes in D1 or rely on browser storage for history.
- Use append-only Drizzle migrations and preserve existing migrations and data.
- Preserve the current package manager and dependencies unless the approved feature requires a change.
- Do not publish until desktop/mobile flows, brand isolation, migrations, and protected routes pass checks.

## Review Focus

- Missing `brandId` on existing requests must keep using Omega; unknown IDs must fail clearly. Test in Task 1.
- A brief, fact, source, or learned exemplar from one brand must never enter another brand's prompt. Test in Tasks 1 and 3.
- Anonymous and signed-in non-owner requests must not read or mutate new brand data or spend the image budget. Test in Task 2 and Task 4.
- Invalid output dimensions and unsupported or oversized reference images must be rejected before calling OpenAI. Test in Task 4.
- R2 unavailable/failing during an image save must leave no broken history record and preserve the user's current brief. Test in Task 4.

---

### Task 1: Brand profile and prompt domain

**Files:**
- Create: `lib/brandProfiles.ts`
- Modify: `lib/prompts.ts`
- Create: `tests/brandProfiles.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produce `BrandId`, `BrandProfile`, `BRAND_PROFILES`, `isBrandId(id: unknown): id is BrandId`, `getBrandProfile(id?: string): BrandProfile`, and `buildBrandDraftPrompt(brandId: BrandId, brief: Brief, sources: SourceDoc[], learned?: string): { system: string; user: string }`.
- `BrandProfile` contains `id`, `name`, `voice`, `audiences`, `approvedFacts`, `prohibitedClaims`, `palette`, `channels`, `formats`, `defaultImageStyle`, `defaultLighting`, `defaultComposition`, `avoidList`, `imageModel`, `imagePresets`, and nullable `logoObjectKey`.
- `getBrandProfile(undefined)` returns Omega for legacy callers; an unknown non-empty ID throws a typed validation error.
- Omega profile composition reuses the current `VOICE`, `COMPLIANCE`, channel specs, profession settings, and verified facts.
- Profiles for other brands begin with no unverified factual claims. Graduation Hoodies uses `#120000`, `#FFFFFF`, `#EA581F`, and `#666666`; other brand colours remain unset until configured.

- [ ] **Step 1: Write profile and prompt tests** for all four IDs, Omega fallback, invalid ID, default colour values, no cross-brand factual leakage, and each brand's own claim rules.
- [ ] **Step 2: Run the tests and confirm they fail** using `node --experimental-strip-types --test tests/brandProfiles.test.ts`.
- [ ] **Step 3: Implement the profile types and prompt builder** in `lib/brandProfiles.ts` and `lib/prompts.ts`; leave the existing `buildDraftPrompt` behavior intact for current Omega callers.
- [ ] **Step 4: Add `test:unit`** as `node --experimental-strip-types --test tests/*.test.ts` and run the focused test command again.
- [ ] **Step 5: Commit** as `feat: add multi-brand profile and prompt context`.

### Task 2: Owner authorization, D1 model, and profile APIs

**Files:**
- Create: `lib/ownerAuthorization.ts`
- Modify: `db/schema.ts`
- Modify: `lib/schemaSql.ts`
- Modify: `lib/db.ts` (only if its bootstrap schema must match the migration)
- Modify: `cloudflare-env.d.ts`
- Modify: `.openai/hosting.json`
- Create: `app/api/brands/route.ts`
- Create: `app/api/brands/[brandId]/logo/route.ts`
- Create: generated `drizzle/0001_*.sql` and matching `drizzle/meta/*`
- Create: `tests/ownerAuthorization.test.ts`

**Interfaces:**
- `isAuthorizedStudioOwner(userId: string | null, ownerId: string | undefined): boolean` must require exact non-empty ID equality.
- `requireAuthorizedStudioOwner()` returns the authenticated owner identity or a `401`/`403` response; routes must not trust a client-supplied user ID.
- `GET/PUT /api/brands` reads and validates profile settings; missing D1 rows fall back to code defaults. `PUT` accepts one complete profile patch and persists it by stable brand ID.
- Add `brand_id` with a constant `omega-financial` default to `pieces`, `campaigns`, `brand_facts`, `verified_facts`, `knowledge`, `exemplars`, `findings`, and `activity_log`; add `brand_profiles` and `generated_assets`. Keep subordinate version/lesson/performance records associated through `piece_id`. Add the logical R2 binding as `MEDIA`.

- [ ] **Step 1: Test owner identity matching** for missing user, missing configured owner, wrong ID, and exact owner match.
- [ ] **Step 2: Run the authorization tests and confirm failure** before adding the helper.
- [ ] **Step 3: Add the owner guard** using the existing `getChatGPTUser()` server helper and a server-only `STUDIO_OWNER_USER_ID` setting.
- [ ] **Step 4: Extend Drizzle schema and generate the migration** for `brand_profiles`, brand IDs on brand-scoped tables, and `generated_assets`; retain existing tables and defaults.
- [ ] **Step 5: Add `MEDIA` R2 typing and binding** in `cloudflare-env.d.ts` and `.openai/hosting.json`.
- [ ] **Step 6: Add owner-protected profile read/update and logo upload routes**; validate profile fields, accept only PNG/JPEG/WebP logos up to 10 MB, and save logo bytes to R2.
- [ ] **Step 7: Inspect migration SQL and test it against a temporary SQLite fixture** built from the current schema; verify legacy rows still read as Omega and unrelated rows remain unchanged.
- [ ] **Step 8: Run focused tests and commit** as `feat: add brand settings and owner authorization`.

### Task 3: Brand-aware copy, campaigns, review, and history

**Files:**
- Modify: `app/api/generate/route.ts`
- Modify: `app/api/verify/route.ts`
- Modify: `app/api/rewrite/route.ts`
- Modify: `app/api/repurpose/route.ts`
- Modify: `app/api/angles/route.ts`
- Modify: `app/api/hooks/route.ts`
- Modify: `app/api/series/route.ts`
- Modify: `app/api/carousel/route.ts`
- Modify: `app/api/campaigns/route.ts`
- Modify: `app/api/approve/route.ts`
- Modify: `app/api/queue/route.ts`
- Modify: `app/api/library/route.ts`
- Modify: `app/api/activity/route.ts`
- Modify: `app/api/fact-base/route.ts`
- Modify: `app/api/facts/route.ts`
- Modify: `app/api/voicebank/route.ts`
- Modify: `app/api/knowledge/route.ts`
- Modify: `app/page.tsx`
- Modify: `components/Campaigns.tsx`
- Modify: `components/HighlightedDraft.tsx`
- Create: `tests/brandIsolation.test.ts`

**Interfaces:**
- New and updated content requests carry `brandId`; omitted IDs remain Omega, and non-Omega requests pass `requireAuthorizedStudioOwner()`.
- Campaign and piece rows are written/read with `brand_id`; campaign joins and history queries filter by the same brand.
- `onUse(campaign)` carries `brandId`, campaign topic, audience, channel, and brief without mutating the source campaign.

- [ ] **Step 1: Add prompt isolation tests** asserting that non-Omega generation and review prompts include only their profile and records, and Omega prompts retain the old compliance rules.
- [ ] **Step 2: Run the tests and confirm they fail** before route changes.
- [ ] **Step 3: Make copy prompt routes brand-aware** in `/api/generate`, `/api/verify`, `/api/rewrite`, `/api/repurpose`, `/api/angles`, `/api/hooks`, `/api/series`, and `/api/carousel`; keep Omega behavior unchanged when `brandId` is omitted or is Omega.
- [ ] **Step 4: Scope campaign, approval, queue, library, activity, fact-base, verified-fact, exemplar, and brand-profile queries** in `/api/campaigns`, `/api/approve`, `/api/queue`, `/api/library`, `/api/activity`, `/api/fact-base`, `/api/facts`, `/api/voicebank`, and `/api/knowledge`; reject non-owner access to new non-Omega records.
- [ ] **Step 5: Add brand state to the writing page and its modules**; pass it through generation, audit, approval, campaign, fact, and history requests. Keep campaign plan and review context brand-scoped. Hide Omega-only interview, profession knowledge, and estate tools outside the Omega profile.
- [ ] **Step 6: Add brand ID to newly approved pieces and activity rows** while legacy `NULL`/default rows stay Omega; run brand isolation tests for each list endpoint.
- [ ] **Step 7: Run unit tests and verify the build** with `npm run test:unit` and `npm run build`; commit as `feat: scope content studio by brand`.

### Task 4: Protected image generation and private asset history

**Files:**
- Create: `lib/imageGeneration.ts`
- Create: `app/api/images/generate/route.ts`
- Create: `app/api/images/route.ts`
- Create: `app/api/images/[assetId]/route.ts`
- Modify: `cloudflare-env.d.ts`
- Create: `tests/imageGeneration.test.ts`

**Interfaces:**
- `normalizeImageDimensions(width: number, height: number): { width: number; height: number; providerSize: string }` validates positive integer dimensions, 1:3–3:1 aspect, edges up to 3840, and 655,360–8,294,400 total pixels; provider dimensions use multiples of 16.
- `buildImagePrompt(input: { brandId: BrandId; subject: string; style: string; lighting: string; composition: string; lens: string; mood: string; avoid: string; approvedFacts: string[]; useText: boolean; hasReference: boolean }): string` uses only the selected profile.
- `POST /api/images/generate` owner-checks, accepts one to four variants and supported PNG/JPEG/WebP references up to 10 MB, calls `POST /v1/images/generations` without a reference or `POST /v1/images/edits` with one, writes each output to private R2, and stores metadata in D1.
- `GET /api/images` and `GET /api/images/[assetId]` owner-check and filter by brand; media bytes stream through an authorized route, never a public R2 URL.

- [ ] **Step 1: Test size normalization, prompt isolation, count bounds, content-type limits, and reference-size limits** with Node's test runner.
- [ ] **Step 2: Run tests and confirm the new behaviors fail** before implementing them.
- [ ] **Step 3: Implement image size/prompt utilities** and validate against the current OpenAI Image API contract; use `gpt-image-2.5-flare` by default and `gpt-image-2.5-sunburst` for reference-based edits.
- [ ] **Step 4: Implement owner-protected generation, R2 storage, D1 metadata, and authorized retrieval**; write no metadata until every image upload succeeds, and clean up partial R2 objects on failure.
- [ ] **Step 5: Run focused tests** for authorization, validation, storage failure cleanup, and retrieval scoping; commit as `feat: add protected image studio api`.

### Task 5: Brand-aware interface and Image Studio

**Files:**
- Create: `components/BrandSwitcher.tsx`
- Create: `components/BrandSettings.tsx`
- Create: `components/ImageStudio.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `BrandSwitcher` receives `{ value: BrandId; profiles: BrandProfile[]; onChange(id: BrandId): void }`.
- `ImageStudio` receives `{ brand: BrandProfile; campaignSeed?: CampaignSeed; onClearCampaignSeed(): void }`; it owns editable image fields and renders result/history states.
- `BrandSettings` edits only the selected profile and calls `PUT /api/brands` after explicit save.

- [ ] **Step 1: Build the brand switcher and settings panel** using the site's existing controls and visual tokens.
- [ ] **Step 2: Add brand-specific brief fields** while keeping Omega profession fields and defaults unchanged.
- [ ] **Step 3: Add Image Studio** with preset/custom orientations, references, one-to-four variants, safe-area preview, logo placement, downloads, and brand-filtered saved history.
- [ ] **Step 4: Add “Create matching image” to campaigns and drafts**; prefill the topic and short brief, but require user review before generation.
- [ ] **Step 5: Run the build and local desktop/mobile browser checks** for default Omega, all brand settings, conditional fields, campaign handoff, responsive navigation, and long results; commit as `feat: add multi-brand content studio interface`.

### Task 6: End-to-end verification and Site publication

**Files:**
- Modify only any defect found in Tasks 1–5; do not rewrite unrelated Site features.

- [ ] **Step 1: Install using the existing project script** with `npm run install:ci` if dependencies are missing.
- [ ] **Step 2: Run `npm run test:unit` and `npm run build`**; verify all tests pass and the Worker bundle builds.
- [ ] **Step 3: Run a local Worker preview** and test Omega draft/audit/campaign regression, all four brand switches, brand-specific copy, image generation, downloads, and persistence.
- [ ] **Step 4: Test access paths**: anonymous requests are rejected for new brand/image routes, a non-owner is rejected, and the owner can generate and read saved assets.
- [ ] **Step 5: Test responsive layouts** at desktop and phone widths; fix only observed navigation, form, result, scrolling, or keyboard issues.
- [ ] **Step 6: Confirm the `MEDIA` R2 binding, `STUDIO_OWNER_USER_ID`, and image model access**. If R2 or image model access is unavailable, do not publish a broken image workflow; report the precise setup blocker.
- [ ] **Step 7: Package and push the verified source with the Sites workflow**, save and deploy to the existing Site using its current public audience, then confirm deployment success and open the deployed Site for a final check.

## Current API reference

The OpenAI Image API supports `POST /v1/images/generations` and `POST /v1/images/edits`, multiple outputs, configurable quality/format, and custom dimensions subject to documented constraints. Use the current official guide during implementation: <https://developers.openai.com/api/docs/guides/image-generation>.
