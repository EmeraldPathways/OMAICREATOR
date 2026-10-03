import assert from "node:assert/strict";
import test from "node:test";
import { parseBrandProfilePatch } from "../lib/brandProfileValidation.ts";
import { rankScopeUrl } from "../lib/rankscope.ts";
import { getBrandProfile } from "../lib/brandProfiles.ts";

test("accepts editable brand voice, facts, and palette", () => {
  assert.deepEqual(parseBrandProfilePatch({
    voice: "Friendly and direct",
    approvedFacts: ["Open seven days"],
    palette: ["#123ABC"],
  }), {
    voice: "Friendly and direct",
    approvedFacts: ["Open seven days"],
    palette: ["#123ABC"],
  });
});

test("accepts a business website and optional per-brand Google properties", () => {
  assert.deepEqual(parseBrandProfilePatch({
    websiteUrl: "https://example.ie",
    gscSiteUrl: "sc-domain:example.ie",
    ga4PropertyId: "123456789",
  }), {
    websiteUrl: "https://example.ie",
    gscSiteUrl: "sc-domain:example.ie",
    ga4PropertyId: "123456789",
  });
});

test("rejects unsafe website URLs and malformed Google property IDs", () => {
  assert.throws(() => parseBrandProfilePatch({ websiteUrl: "http://user:pass@example.ie" }), /valid public website URL/);
  assert.throws(() => parseBrandProfilePatch({ websiteUrl: "http://127.0.0.1" }), /valid public website URL/);
  assert.throws(() => parseBrandProfilePatch({ ga4PropertyId: "property; DROP TABLE" }), /GA4 property ID/);
});

test("builds an isolated RankScope embed URL for the selected brand and feature", () => {
  const profile = { ...getBrandProfile("eco-car-wash"), gscSiteUrl: "sc-domain:ecocarwash.ie", ga4PropertyId: "12345" };
  const url = new URL(rankScopeUrl(profile, "Site Audit"));
  assert.equal(url.origin, "https://omega-content-studio.emeraldpathways.chatgpt.site");
  assert.equal(url.pathname, "/rankscope");
  assert.equal(url.searchParams.get("embed"), "1");
  assert.equal(url.searchParams.get("brandId"), "eco-car-wash");
  assert.equal(url.searchParams.get("domain"), "ecocarwash.ie");
  assert.equal(url.searchParams.get("view"), "Site Audit");
  assert.equal(url.searchParams.get("ga4PropertyId"), "12345");
  assert.equal(new URL(rankScopeUrl(profile, "not-a-feature")).searchParams.get("view"), "Overview");
});

test("rejects identity and storage fields from client profile updates", () => {
  assert.throws(() => parseBrandProfilePatch({ id: "omega-financial" }), /not editable/);
  assert.throws(() => parseBrandProfilePatch({ logoObjectKey: "public/logo.png" }), /not editable/);
});

test("rejects malformed colours and unsupported image models", () => {
  assert.throws(() => parseBrandProfilePatch({ palette: ["red"] }), /hexadecimal/);
  assert.throws(() => parseBrandProfilePatch({ imageModel: "unapproved-model" }), /Unsupported image model/);
});

test("rejects image presets outside the supported size range", () => {
  assert.throws(() => parseBrandProfilePatch({ imagePresets: [{ id: "tiny", label: "Tiny", width: 0, height: 200 }] }), /width is invalid/);
});
