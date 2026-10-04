# Responsive Mobile and Desktop Redesign

Date: 2026-10-04

## Purpose

Make the complete Content Studio comfortable and dependable on phones and desktop screens without removing or weakening any existing feature. Mobile is the first priority. Every main view, Review Desk screen, RankScope feature, Image Studio workflow, and brand workspace must reflow cleanly, use predictable spacing, and expose its controls without clipped navigation or nested scrolling.

## Success Criteria

- Review Desk and RankScope use a labelled dropdown for feature navigation below 760px.
- Desktop retains visible top-level feature tabs without hiding Reports, Integrations, or other destinations.
- Interactive controls meet a 44px minimum touch target on mobile.
- Forms and cards become a single readable column when the available width is narrow.
- No page introduces document-level horizontal scrolling at supported widths.
- Embedded Review Desk and RankScope screens avoid unnecessary nested vertical scroll regions.
- Existing brand separation, content generation, review workflows, RankScope data, authentication, and API contracts remain unchanged.
- Every view is exercised at mobile and desktop widths before publication.

## Supported Viewports

The primary verification sizes are:

- Mobile: 390 × 844 CSS pixels.
- Small mobile: 360 × 800 CSS pixels for overflow checks.
- Desktop: 1440 × 900 CSS pixels.
- Compact desktop/tablet: 1024 × 768 CSS pixels for breakpoint checks.

The interface must also remain usable with browser zoom up to 200 percent and with long brand names or control labels.

## Chosen Approach

Use an adaptive responsive layer shared by the shell and connected workspaces. Existing business components remain in place, but navigation and layout receive explicit mobile and desktop presentations.

This approach was selected over shrinking the existing rows or performing a full native rewrite of both embedded workspaces. Shrinking would preserve poor discoverability and touch targets. A full rewrite would add migration risk without improving the requested responsive experience.

## Information Architecture

The main sidebar continues to organise the product into Write for, Craft, Manage, Reference, and Connected workspaces.

On mobile, the sidebar becomes an accessible modal drawer opened from the sticky top bar. Selecting a destination closes the drawer, returns focus appropriately, and scrolls the new view to the top. Image Studio, Review Desk, and RankScope remain grouped together near the bottom of the drawer.

Review Desk retains these destinations:

- Inbox
- Insights
- Your style
- Business knowledge
- Automation
- Connections
- Activity

RankScope retains these destinations:

- Overview
- Keywords
- Keyword Gap
- Competitors
- Rank Tracker
- Backlinks
- Site Audit
- On-Page SEO
- Topic Research
- Writing Assistant
- Content Briefs
- Reports
- Integrations

Below 760px each workspace presents its destinations through a native labelled select control. Above that breakpoint it presents tabs. Both controls update the same view state so there is one navigation model, not two separate workflows.

## Responsive Shell

### Mobile

- The top bar uses two compact rows only when account and brand controls cannot fit on one row.
- The page title remains visible next to the menu button.
- Workspace and account controls use the available width without forcing horizontal scrolling.
- Page gutters are 16px, reduced to 14px only where an embedded surface needs edge-to-edge content.
- Content panels use 16–18px internal padding.
- Two-column application layouts collapse to one column.
- Sticky desktop side panels become normal document-flow sections.
- Primary actions become full-width when they are the clear next step.
- Secondary actions may share a row only when each retains at least a 44px target and readable label.

### Desktop

- The expanded sidebar remains 268px and the collapsed rail remains available.
- Main content uses 24–32px gutters and a consistent maximum readable width where a view does not require full-width data tables.
- Existing two-column creation and ledger layouts remain, but collapse before either column becomes cramped.
- Headers align title, brand controls, and actions consistently.
- RankScope tabs wrap into a deliberate second row when required rather than clipping or hiding destinations.

## Shared Component Behaviour

### Responsive Section Navigation

A shared navigation pattern provides:

- A semantic `nav` and tab buttons on desktop.
- A visible label and native `select` on mobile.
- The same selected value and change handler for both presentations.
- `aria-current` on the active desktop destination.
- Clear focus styling and a 44px minimum control height.

RankScope uses this pattern in the React parent workspace. Selection continues to update the embedded RankScope view through the existing `postMessage` contract.

Review Desk receives the equivalent pattern inside its hosted UI document. The dropdown and desktop buttons call the same render function and preserve the current screen while the viewport changes.

### Buttons and Action Groups

- Base application buttons have a 44px minimum height.
- Mobile action groups stack when labels would wrap or targets would shrink.
- Destructive, primary, and secondary hierarchy remains visible through colour, border, and ordering.
- Disabled controls retain enough contrast to be recognisable without appearing actionable.
- Icon-only controls require an accessible name and a square 44px target.

### Forms

- Inputs, textareas, and selects use a 16px minimum font size on mobile to avoid automatic browser zoom.
- Multi-column field grids collapse to one column at 760px.
- Labels stay immediately above their controls.
- Long help copy wraps without changing the control width.
- Validation and status messages remain adjacent to the relevant form or action.

### Cards, Tables, and Data Displays

- Metric grids use two columns on ordinary phones and one column below 380px when content requires it.
- Dense data tables remain horizontally scrollable inside their own bounded region on desktop and tablet.
- On phones, supported RankScope tables use their existing `data-label` values to become labelled stacked rows where practical.
- Cards avoid fixed heights and allow long titles or translated copy to grow naturally.
- Empty, loading, and error states retain the same padding and hierarchy as populated states.

## Embedded Workspace Sizing

The current fixed minimum iframe heights create double scrolling and excess blank space. Each same-origin embedded workspace will report or expose its document height after render and resize. The parent will update the iframe height within sensible minimum and maximum bounds.

The parent document owns vertical scrolling. The iframe continues to own only controls that intentionally scroll internally, such as wide tables. If automatic height measurement is unavailable, the iframe falls back to a safe viewport-based minimum rather than collapsing.

Height synchronisation must be isolated from business data. It transports only layout metadata and does not change authentication, review content, SEO data, or brand state.

## Page-by-Page Scope

The responsive pass includes:

- Email, LinkedIn, Instagram, Website article, and Print article creation.
- Advisor interview and Voice bank.
- Campaigns, Review queue, History, and Activity.
- Fact base, Library, Brand settings, Profession knowledge, Estate sweep, and Setup.
- Image Studio, including orientation, size, generation controls, and history.
- Review Desk Inbox, Insights, Your style, Business knowledge, Automation, Connections, and Activity.
- Every RankScope feature listed in the information architecture section.
- Login and authentication error states.
- All four business workspaces.

## State and Data Flow

Responsive presentation does not create a second source of truth.

- Main navigation continues to update the shell `view` state.
- Review Desk navigation continues to update its existing `view` variable and rerender.
- RankScope selection continues to update `feature` in the parent and `view` in the embedded app through the existing message event.
- Brand switching continues to select the existing brand profile and scoped storage.
- Iframe height messages contain only a numeric height and a workspace identifier.

Changing breakpoints must not reset the current view, form contents, selected filters, or generated content.

## Accessibility

- Drawer open and close actions preserve focus and support Escape.
- Mobile section dropdowns have visible labels.
- Touch targets are at least 44 × 44px.
- Focus indicators remain visible against navy, white, and tinted backgrounds.
- Reading order follows the visual order after columns collapse.
- Status messages retain `role=status` or `role=alert` where already present.
- Reduced-motion preferences continue to disable nonessential transitions.
- Colour is not the sole indicator for active, success, warning, or error states.

This work will test accessibility risks that can be verified in the browser but will not claim full WCAG compliance without assistive-technology testing.

## Error and Loading Behaviour

- Embedded workspaces keep their current loading states until the iframe is ready.
- A failed height handshake falls back to the current safe minimum height.
- Navigation remains usable if a workspace API request fails.
- Error messages wrap on mobile and never push the page wider than the viewport.
- Refresh and Open in new tab remain available for RankScope, with mobile-safe sizing.

## Verification Strategy

Testing proceeds mobile-first and then desktop.

For each supported viewport, the tester will visit every page in the page-by-page scope and check:

1. Initial rendering and loading state.
2. Navigation to and from the page.
3. Heading, card, form, and action spacing.
4. Horizontal overflow and nested scrolling.
5. Button size, wrapping, disabled state, and focus visibility.
6. Form controls, filters, tabs or dropdowns, and empty states.
7. Brand switching and preservation of brand-scoped content.
8. Browser console errors and failed requests.

Automated tests will cover responsive navigation rendering, view selection, iframe message handling, and existing application regressions. Lint, the full test suite, and the production build must pass. The published Site will then receive a second browser pass at both mobile and desktop widths. Any failure is fixed and the affected page plus neighbouring navigation paths are retested before completion.

## Out of Scope

- Replacing Review Desk or RankScope business logic.
- Changing authentication providers or credentials.
- Introducing new SEO, review, or content-generation features.
- Rebranding the visual system away from the current Review Desk-inspired navy, teal, cool-grey, and Inter-based style.
- Changing API schemas or brand ownership rules except for layout-only iframe height messages.
