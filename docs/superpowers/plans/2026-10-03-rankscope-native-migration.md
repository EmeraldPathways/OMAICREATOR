# RankScope native migration

## Goal
Bring the existing RankScope SEO workspace into Omega Content Studio at the existing public Site, preserving its feature panels and API behavior while using Content Studio's email/password owner session and one shared D1 database. Preserve per-brand isolation for the four configured businesses. Retire the standalone Site after the merged deployment passes verification.

## Approach
- Host the original RankScope UI at a same-origin `/rankscope` route and load it from the Content Studio RankScope workspace iframe.
- Bring its API routes, Google OAuth helpers, provider code, and D1 tables into the Content Studio source.
- Have the existing authentication proxy attach the verified owner identity to the internal request header used by RankScope APIs.
- Keep each brand's SEO workspace snapshot keyed to the existing validated brand ID; preserve OAuth at owner scope.
- Verify with unit tests, build, and browser checks before restricting the old Site.

## Data check
The old D1 database has one generic `northstar.io` snapshot, no assistant thread rows, and no Google connection rows. There are no business-specific RankScope workspace snapshots to move. The old Google OAuth environment values are secret-masked and no refresh token row exists; fresh Google authorization on the merged host may require updating the OAuth client's authorized redirect URI.

## Verification
- Test owner identity extraction and brand workspace isolation.
- Run Content Studio unit tests and production build.
- Test anonymous login gate and merged RankScope route in a browser.
- Publish to the existing Content Studio Site and verify deployment status before restricting the old Site.
