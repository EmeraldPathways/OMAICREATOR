# Multi-brand Content Studio design

## Goal

Extend Omega Content Studio so one workspace can create and manage written and visual marketing content for Omega Financial, Graduation Hoodies, Eco Car Wash, and Bonner of Ireland. Preserve existing Omega workflows, drafts, campaigns, settings, and saved data. Keep the current Site access setting unchanged.

## Current context

The live Site is an Omega-focused Next.js/Vinext app with channel-based writing, profession-specific briefs, campaigns, review queue, activity, fact base, library, profession knowledge, estate sweep, and setup. It uses D1 for persistence and already has server-side ChatGPT identity helpers. The Site is currently public and its `DB` D1 binding is configured; it has no R2 binding. The image generator already exists in the separate Eco Car Wash Command Centre project and includes brand profiles, output dimensions and orientations, reference images, multiple variants, safe-area preview, logo overlay, and image history.

## Product design

### Brand context

Add a persistent brand selector to the Content Studio shell. Omega Financial remains the default so existing users land in the same familiar workflow. Add Graduation Hoodies, Eco Car Wash, and Bonner of Ireland as independent profiles. The selected profile scopes new copy, campaign work, review context, and image generation. Existing Omega records remain associated with Omega and are not rewritten or reclassified.

Each profile owns its voice and tone, audiences, approved facts, prohibited or unverified claims, colours, logo assets and placement rules, preferred channels, content formats, and visual direction. Omega retains its current profession and financial-compliance settings. Non-financial brands receive audience and product/service brief fields relevant to their own work; Omega-only profession fields are hidden outside the Omega profile.

### Content creation

Keep the current writing, campaigns, review, and reference tools. Make them brand-aware through the selected profile, and filter brand-specific campaigns, drafts, activity, fact base, and image history by brand. Give each profile its own configuration and reference material. Switching profiles changes the active context for new work; it does not alter existing items.

Add a clear “Create matching image” action to a campaign or approved draft. It carries only the selected brand and the relevant campaign topic, audience, channel, and short creative brief into Image Studio. The user can edit the image prompt before generating. Standalone image creation starts from the selected brand profile.

### Image Studio

Integrate the existing generator as a first-class Content Studio section. Support platform presets, portrait/square/landscape/story orientations, custom dimensions, reference images, one to four variants, a safe-area preview, deterministic logo overlays, and brand-filtered history. Brand-specific prompts must apply the selected profile's visual rules and factual guardrails. Images must not silently inherit another brand's palette, facts, or logo.

### Access and cost controls

Keep the Site's current public sharing setting and public read experience. Require an authenticated, owner-authorized user for Image Studio, generated-image history, saved assets, all new brand-profile reads and writes, and non-Omega content generation and campaign writes. A signed-in identity alone is insufficient; the server must verify the authorized owner. Client-side hiding alone is insufficient. Keep provider credentials server-side. Anonymous public visitors must not be able to spend the owner's image-generation allowance, alter brand settings, or read or create content in the new private brand workspaces. Preserve the current Omega workflow's access and behavior outside this feature's scope.

Use the Site's existing server-side generation configuration where compatible; the existing draft route resolves provider keys server-side. Never pass an API key from browser code to new image routes. If image generation is not configured, show a clear setup state without exposing credentials or returning a misleading success. Do not deploy until protected routes are verified.

## Data and migration

- Give each brand a stable identifier and independent settings record.
- Add a brand identifier to new brand-aware drafts, campaigns, reviews, generated images, and history records. Keep existing Omega records associated with Omega.
- Treat legacy records without an identifier as Omega Financial during a backward-compatible migration; preserve the original content and values.
- Preserve all existing records and Omega defaults.
- Store image metadata in D1 and image bytes in private R2 storage; avoid making generated history publicly addressable. Add the logical R2 binding because the current Site has none. If the account's current storage allowance prevents provisioning, preserve the live Site and report that blocker rather than storing large images in D1 or silently discarding history.

## Acceptance criteria

1. The existing Omega workflow opens by default and retains its current actions and records.
2. The user can switch among all four brands and see the selected brand's own brief fields, facts, tone, visual settings, and prior work.
3. Omega-only profession and financial claim guidance is not applied to other brands; brand-specific restrictions are not cross-contaminated.
4. A campaign/draft can seed a matching image brief, which remains editable before generation.
5. Image Studio produces or clearly reports inability to produce a result for each supported preset and custom size, with variants and brand-safe logo handling.
6. Anonymous requests cannot use Image Studio, generate non-Omega content, change new brand settings, or retrieve brand-specific saved images. The authorized owner can use the feature without revealing a provider key in browser code or responses.
7. Existing Omega drafts, campaigns, reviews, references, and settings remain usable after migration.
8. Desktop and mobile layouts keep brand context visible, make switching understandable, and allow the long image workflow to scroll and complete on touch screens.

## Verification plan

Before publishing, inspect the current Site source and storage schema, then add only the needed changes. Verify migrations against a copy of current data; test brand isolation and legacy-to-Omega behavior; test authorized and anonymous requests for the new brand and image routes; test generation failure and missing-configuration states; run existing regression checks; and exercise the main flows in desktop and mobile browser widths. Deploy to the existing public Site only after these checks pass, preserving its audience.

## Known implementation check

The current checkout confirms a Next.js/Vinext app, Drizzle-managed D1 tables, a server-side OpenAI key resolver, and ChatGPT identity helpers. The existing logical bindings are `DB` and no R2 binding. Implementation must use the established framework and append-only migration process, add the required R2 binding, and preserve the current app structure and data.
