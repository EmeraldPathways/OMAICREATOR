import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { rankScopeUrl, RANKSCOPE_VIEWS } from "../lib/rankscope.ts";
import { queryWorkspaceKey } from "../lib/workspace-context.ts";

test("RankScope is hosted on the existing Content Studio origin and keeps selected brand settings", () => {
  const url = new URL(rankScopeUrl({
    id: "eco-car-wash",
    websiteUrl: "https://www.ecocarwash.ie/",
    gscSiteUrl: "sc-domain:ecocarwash.ie",
    ga4PropertyId: "123456789",
  }, "Keywords"));
  assert.equal(url.pathname, "/rankscope");
  assert.equal(url.searchParams.get("embed"), "1");
  assert.equal(url.searchParams.get("brandId"), "eco-car-wash");
  assert.equal(url.searchParams.get("domain"), "ecocarwash.ie");
  assert.equal(url.searchParams.get("gscSiteUrl"), "sc-domain:ecocarwash.ie");
  assert.equal(url.searchParams.get("ga4PropertyId"), "123456789");
  assert.equal(url.searchParams.get("view"), "Keywords");
  assert.equal(url.hostname, "omega-content-studio.emeraldpathways.chatgpt.site");
});

test("the complete RankScope feature list stays available after migration", () => {
  assert.deepEqual(RANKSCOPE_VIEWS, [
    "Overview", "Keywords", "Keyword Gap", "Competitors", "Rank Tracker", "Backlinks",
    "Site Audit", "On-Page SEO", "Topic Research", "Writing Assistant", "Content Briefs", "Reports", "Integrations",
  ]);
});

test("RankScope APIs accept only the email injected by the signed-in Studio proxy", () => {
  assert.equal(queryWorkspaceKey(new Request("https://studio.test/api/workspace/state?brandId=eco-car-wash", {
    headers: { "x-studio-owner-email": "owner@example.ie" },
  })), "owner@example.ie::eco-car-wash");
  assert.equal(queryWorkspaceKey(new Request("https://studio.test/api/workspace/state?brandId=eco-car-wash", {
    headers: { "oai-authenticated-user-email": "owner@example.ie" },
  })), "");
});

test("embedded RankScope hides its internal navigation and releases the sidebar offset", async () => {
  const css = await readFile(fileURLToPath(new URL("../app/rankscope/rankscope.css", import.meta.url)), "utf8");
  assert.match(css, /\.rankscope-root \.workspace\{[^}]*display:block/);
  assert.match(css, /\.rankscope-root\.embedded \.sidebar\{display:none\}/);
  assert.match(css, /\.rankscope-root\.embedded \.workspace\{margin-left:0;min-height:0\}/);
  assert.match(css, /\.rankscope-root\.embedded \.topbar\{position:sticky;top:0\}/);
  assert.match(css, /\.rankscope-root\.embedded \.mobile-topline\{display:none\}/);
  assert.doesNotMatch(css, /\.rankscope-root \.embedded \.sidebar\{display:none\}/);
});

test("RankScope offers tabs on desktop and a labelled select on mobile", async () => {
  const navSource = await readFile(fileURLToPath(new URL("../components/ResponsiveSectionNav.tsx", import.meta.url)), "utf8");
  const workspaceSource = await readFile(fileURLToPath(new URL("../components/RankScopeWorkspace.tsx", import.meta.url)), "utf8");
  const css = await readFile(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

  assert.match(navSource, /<nav\b/);
  assert.match(navSource, /<label\b[^>]*htmlFor=/);
  assert.match(navSource, /<select\b[^>]*id=/);
  assert.match(navSource, /items\.map/);
  assert.match(navSource, /onChange=\{\(event\) => onChange\(event\.target\.value as T\)\}/);
  assert.match(navSource, /aria-current=/);
  assert.match(workspaceSource, /items=\{RANKSCOPE_VIEWS\}/);
  assert.match(workspaceSource, /value=\{feature\}/);
  assert.match(workspaceSource, /onChange=\{setFeature\}/);
  assert.match(css, /\.responsive-section-mobile/);
  assert.match(css, /\.responsive-section-desktop/);
});

test("every RankScope page family reflows at mobile and compact widths", async () => {
  const css = await readFile(fileURLToPath(new URL("../app/rankscope/rankscope.css", import.meta.url)), "utf8");
  const page = await readFile(fileURLToPath(new URL("../app/rankscope/page.tsx", import.meta.url)), "utf8");

  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.rankscope-root \.topbar\{[^}]*display:grid/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?font-size:16px/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?min-height:44px/);
  assert.match(css, /\.analysis-form[^}]*grid-template-columns:1fr/);
  assert.match(css, /\.writer-layout[^}]*grid-template-columns:1fr/);
  assert.match(css, /\.report-builder[^}]*grid-template-columns:1fr/);
  assert.match(css, /\.metric-grid\{grid-template-columns:repeat\(2,1fr\)\}/);
  assert.match(css, /td:before\{content:attr\(data-label\);/);
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
  assert.match(css, /\.link-health[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(page, /data-label="SERP features"/);
});
