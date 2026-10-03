import assert from "node:assert/strict";
import test from "node:test";
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
