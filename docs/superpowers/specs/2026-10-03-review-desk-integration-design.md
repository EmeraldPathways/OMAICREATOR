# Review Desk integration design

## Goal

Add the Google Business Profile Review Desk from `EmeraldPathways/GMBautoreply` to the existing Content Studio as a new sidebar area. Preserve Content Studio and its RankScope area. The Review Desk must use the app's current email/password sign-in and keep each Content Studio business's review settings and records separate.

## User experience

- Add a **Review Desk** item in a distinct bottom section of the sidebar, alongside the app's existing RankScope entry.
- Selecting it opens the Review Desk in the main Content Studio workspace. The existing app header, active business selector, responsive layout, and session remain in place.
- The Review Desk shows its Inbox, Insights, Your style, Business knowledge, Automation, Connections, and Activity sections.
- Review Desk settings and records are scoped to the active Content Studio brand: Omega Financial, Graduation Hoodies, Bonner of Ireland, or Eco Car Wash. Changing brands must not show or modify another brand's locations, review drafts, examples, or automation settings.
- Initial connection and automation setup is explicit. Automation is off by default; public replies require the existing Review Desk's express consent, and sensitive or complaint reviews remain manual-review only.
- If Google Business Profile credentials or API approval are not configured, the Connections section explains what is missing and the rest of Content Studio continues to work.

## Architecture

- Vendor the hosted Review Desk Worker modules from the linked repository into Content Studio and adapt them behind first-party Next.js routes. Do not create a second Site, login system, or separately embedded public application.
- Serve its UI from a protected same-origin route. Add an authenticated API catch-all route that forwards supported Review Desk requests to the Worker handler using the existing D1 binding, OpenAI configuration, and `x-studio-owner-email` identity set by Content Studio's proxy.
- Do not trust a caller-supplied owner header. The forwarding route must rely on the app proxy's session validation, and the webhook route is the only exception: allow only that exact POST route through the proxy and require the Review Desk's signed Google Pub/Sub JWT verification before processing its payload.
- Use a strict route/method allowlist for the adapter. Keep provider secrets server-side. OAuth start/callback must use the Content Studio origin and a dedicated callback path; OAuth state and PKCE verification remain in the Review Desk security module.
- Keep Review Desk tables in the existing D1 database with an `rd_` prefix and a `brand_id` scope. Every query and mutation must include the active brand scope; OAuth state/session records must also be bound to the initiating signed-in owner and brand. Apply the schema idempotently through the app's established D1 initialization path.
- Preserve the upstream review-sync, external-edit detection, reply guard, delayed publishing, daily limits, business hours, approval workflow, audit trail, temporary cache/purge policy, Pub/Sub validation, and scheduled checks. Do not silently loosen upstream safeguards as part of the hosting adaptation.
- A missing Google OAuth client, token-encryption key, or Google Business Profile API access must produce a clear setup status. Use the app's existing OpenAI secret only for draft generation; do not expose it to browser code.

## Security and data handling

- All interactive Review Desk routes require the Content Studio owner session.
- OAuth refresh tokens are encrypted at rest with a dedicated server secret. OAuth state uses PKCE, short expiry, and one-time consumption.
- Pub/Sub push authentication remains cryptographically validated; invalid requests are rejected before reading or changing review data.
- Google review content remains temporary and is purged under the upstream 30-day retention behavior. Saved examples must contain approved response wording and not retain original customer review text as learning material.
- Draft generation uses structured outputs and `store:false`; never publish drafts automatically unless the owner explicitly enables publish mode and confirms consent in the UI.
- The brand identifier is validated against the four known Content Studio brand IDs, rather than accepted as arbitrary SQL input.

## Failure behavior

- Missing Google or encryption configuration disables connection actions and gives an actionable setup message without failing the whole app.
- Google API errors, stale review edits, already-replied reviews, unsafe draft content, schedule violations, and exhausted daily limits are surfaced as non-publishable states with clear explanations.
- Callback failures return to the protected Review Desk with a safe error status and do not expose authorization codes, tokens, or secret values.
- Route errors are logged without review text, tokens, or credentials.

## Verification criteria

1. Sidebar navigation opens Review Desk and preserves all existing Content Studio and RankScope navigation.
2. Sign-out redirects to the existing app sign-in flow; unauthenticated requests cannot access UI, API, OAuth callbacks, or brand data.
3. Brand-isolation tests prove settings, locations, reviews, examples, activity, and OAuth state cannot cross brand boundaries.
4. API adapter tests cover allowed methods/routes, invalid paths, origin checks, owner authentication, Pub/Sub JWT rejection, and OAuth state/PKCE failures.
5. Review workflow tests cover sync, preserving drafts across sync, external review edits, sensitive flags, draft generation, approval, publish re-read guards, publish consent, schedule windows, daily caps, and retention purge.
6. Run the full unit and build checks, then test the signed-in web app at desktop and mobile widths. Verify loading, empty, configured, unconfigured, error, inbox, insights, settings, navigation, and return-to-brand states; resolve failures and repeat the checks.
7. Publish the changes to the existing Content Studio Site only after checks pass. Live Google profile connection can be verified only after authorized API credentials and Google API project approval are configured.

## Scope boundaries

- Keep the existing Content Studio features, authentication, and RankScope intact.
- Do not create or publish another Site.
- Do not enable automatic public replies by default.
- Do not claim live Google integration is working until Google credentials, API access, and a profile connection are available.
- Do not migrate or delete the standalone `GMBautoreply` repository or its project as part of this app integration.
