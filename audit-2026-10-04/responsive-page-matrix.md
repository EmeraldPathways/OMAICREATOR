# Responsive page matrix — 2026-10-04

## Scope and result

- **Current result:** production pages were reviewed with an owner session at the available 1363 × 936 desktop viewport; automated checks pass. Exact target-size and mobile visual acceptance remain blocked by unavailable viewport controls.
- **Production version:** Sites v43, commit `0d3533bc6b4b02a5309a122f2152db4a5d38e992`, deployment `appgdep_6ac2640e6d34819197ec32eab9a99519`.
- **Automated verification:** `npm run test:unit` (88/88), `npm run lint` (exit 0), and `npm run build` (exit 0).
- **Local preview:** `npm run dev` reported a pre-existing server on port 5173, but readiness requests from this workspace could not connect. The cloud browser rejected `127.0.0.1:5173` with `net::ERR_BLOCKED_BY_CLIENT`.
- **Cloud browser:** the signed-in production app was reviewed at 1363 × 936 across all 18 Studio destinations, all 7 Review Desk tabs, and all 13 RankScope tabs. The app shell and embeds had no horizontal overflow at this viewport. This is not a 1440 × 900 or 1024 × 768 run. The first reload snapshot briefly showed disabled owner controls; a fresh snapshot confirmed the session remained active, and the Image Studio correction passed its post-deploy visual retest.
- **Authentication:** the owner signed in manually for this review. The live owner session remained active after page hydration; no credentials were read or entered.
- **Viewport control:** the selected cloud-browser surface exposes no supported viewport-resize/device-emulation control. I tried Chrome's `Control+plus`, `Control+Shift+=`, and `ctrl+KP_Add` shortcuts; after each, the page still reported 1363 × 936 at device pixel ratio 1 and CSS zoom 1. No zoom change was applied. Exact 390 × 844, 360 × 800, 1440 × 900, 1024 × 768 and 200% zoom checks remain unverified.
- **Console:** no page-origin console errors were observed during the signed-in review. Captured errors referenced the browser extension (`chrome-extension://…`), not the Site.

## Page matrix

`Automated` records responsive source/regression coverage plus the successful suite/build; it does not substitute for visual browser acceptance. `Browser` records only observed production UI states.

| # | Area | View | Automated | Mobile browser (390 × 844 / 360 × 800) | Desktop browser (1440 × 900 / 1024 × 768) |
|---:|---|---|---|---|---|
| 1 | Studio | Email | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 2 | Studio | LinkedIn | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 3 | Studio | Instagram | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 4 | Studio | Web Article | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 5 | Studio | Print Article | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 6 | Studio | Advisor interview | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 7 | Studio | Voice bank | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 8 | Studio | Campaigns | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 9 | Studio | Review queue | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 10 | Manage | History | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 11 | Manage | Activity | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 12 | Reference | Fact base | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 13 | Reference | Library | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 14 | Settings | Brand settings | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 15 | Reference | Profession knowledge | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 16 | Reference | Estate sweep | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 17 | Settings | Setup | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 18 | Connected workspace | Image Studio | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 19 | Review Desk | Inbox | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 20 | Review Desk | Insights | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 21 | Review Desk | Your style | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 22 | Review Desk | Business knowledge | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 23 | Review Desk | Automation | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 24 | Review Desk | Connections | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 25 | Review Desk | Activity | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 26 | RankScope | Overview | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 27 | RankScope | Keywords | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 28 | RankScope | Keyword Gap | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 29 | RankScope | Competitors | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 30 | RankScope | Rank Tracker | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 31 | RankScope | Backlinks | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 32 | RankScope | Site Audit | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 33 | RankScope | On-Page SEO | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 34 | RankScope | Topic Research | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 35 | RankScope | Writing Assistant | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 36 | RankScope | Content Briefs | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 37 | RankScope | Reports | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 38 | RankScope | Integrations | PASS | BLOCKED — exact mobile viewport unavailable | OBSERVED — 1363 × 936; exact target sizes unavailable |
| 39 | Login | Email and password | PASS | BLOCKED — exact mobile viewport unavailable | PARTIAL — login inspected at 1363 × 936 |

## Implemented and retested before browser review

- Shared shell: 44px touch controls, 16px mobile fields, one-column mobile grids, non-sticky ledger flow, compact desktop breakpoint and truncation/overflow guards.
- RankScope: one shared active destination state, desktop tabs plus mobile select, bounded same-origin iframe-height protocol, responsive layout rules for all 13 views, labelled stacked mobile table data and 360px fallbacks.
- Review Desk: same seven destinations in desktop tabs and the mobile select; same state retained after changes; content-height reports on render and resize.
- Image Studio: orientation and width/height controls reflow through the mobile one-column grid; generation and download actions become full width; saved images collapse to one column.
- History: five channel tabs remain horizontally navigable; article cards, long text, and actions reflow with overflow protection.
- Full unit suite and production build passed after the changes.

## Remaining browser acceptance

A browser surface capable of setting CSS viewport dimensions is still needed for the requested mobile sizes, exact desktop sizes, touch-target measurements and 200% zoom. The available desktop inspection covered page state, spacing and horizontal overflow at 1363 × 936; mobile behavior remains supported by source tests, not visual browser evidence.

The attempted browser zoom shortcuts did not change the page viewport or CSS zoom, so they cannot be used as a valid proxy for mobile-width acceptance in this cloud-browser session.

## Desktop regression checks

- Added `desktop shell and connected workspaces retain a compact wide-screen layout`; it verifies the 360px ledger column above the 1100px compact breakpoint, normal-flow ledger below it, wrapping desktop RankScope tabs, and the measured iframe fallback rule.
- Focused desktop source check: PASS (8/8 layout/navigation tests).
- Exact desktop and mobile targets remain unverified because the cloud browser cannot resize its viewport. The authenticated page review used 1363 × 936.
- The page-state review covered each listed destination at the available 1363 × 936 viewport. Exact viewport and mobile visual checks remain unverified.

## Final review follow-up (2026-10-04)

A fresh whole-branch code review found and prompted fixes for three responsive issues:

- The mobile navigation drawer now closes when the viewport crosses into desktop width; focus is restored to the mobile menu button only when it is visible.
- Review Desk and RankScope now report natural content height instead of the iframe viewport height, so frames can shrink after content or width changes. RankScope's embedded workspace no longer enforces a viewport-height minimum.
- The mobile business selector now uses 16px text.

Regression checks were added. Final local checks: 88/88 unit tests, lint, production build, and `git diff --check` pass. These code checks do not replace the blocked visual/browser acceptance rows above.

The signed-in live review at 1363 × 936 found short default widths on five Image Studio text inputs. A scoped CSS rule and regression assertion were added; the assertion failed before the CSS change, then passed with the 88-test suite. Lint, build, and diff check passed. Version 43 (`0d3533bc6b4b02a5309a122f2152db4a5d38e992`) is live. The post-deploy production retest passed: Style, Mood, Lighting, Lens, and Visual avoid list fields now fill their available columns; the app shell has no horizontal overflow at 1363 × 936.
