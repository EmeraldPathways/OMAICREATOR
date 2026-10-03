import assert from "node:assert/strict";
import test from "node:test";
import { BRAND_PROFILES } from "../lib/brandProfiles.ts";
import { buildBrandAuditPrompt, buildBrandDraftPrompt, buildBrandOperationPrompt, buildDraftPrompt } from "../lib/prompts.ts";

const brief = { channel: "instagram", format: "single post", profession: "local customers", topic: "seasonal service", tone: "friendly" };

test("brand draft, audit, and rewrite prompts use only the selected brand profile", () => {
  for (const id of ["graduation-hoodies", "eco-car-wash", "bonner-of-ireland"] as const) {
    const profile = { ...BRAND_PROFILES[id], approvedFacts: [`${id}: APPROVED_PROFILE_FACT`] };
    const draft = buildBrandDraftPrompt(id, brief, [], "", profile);
    const audit = buildBrandAuditPrompt("Draft text", brief, [], profile);
    const operation = buildBrandOperationPrompt(profile, "rewrite", "Return JSON.", { text: "Draft text" });
    for (const prompt of [draft, audit, operation]) {
      assert.match(prompt.system, new RegExp(profile.name));
      assert.match(prompt.system, /APPROVED_PROFILE_FACT/);
      assert.doesNotMatch(prompt.system, /Central Bank of Ireland|financial advisory firm|Omega Financial Management/);
    }
  }
});

test("legacy prompt calls still use the original Omega prompt", () => {
  const oldPrompt = buildDraftPrompt(brief, []);
  const brandPrompt = buildBrandDraftPrompt("omega-financial", brief, []);
  assert.deepEqual(brandPrompt, oldPrompt);
  assert.match(oldPrompt.system, /Central Bank of Ireland/);
});
