import assert from "node:assert/strict";
import test from "node:test";

const profileModule = await import("../lib/brandProfiles.ts").catch(() => ({} as typeof import("../lib/brandProfiles.ts")));
const promptModule = await import("../lib/prompts.ts").catch(() => ({} as typeof import("../lib/prompts.ts")));
const { BRAND_PROFILES, getBrandProfile, isBrandId } = profileModule;
const { buildBrandDraftPrompt, buildDraftPrompt } = promptModule;

test("registers all four stable brand profiles", () => {
  assert.deepEqual(Object.keys(BRAND_PROFILES), [
    "omega-financial",
    "graduation-hoodies",
    "eco-car-wash",
    "bonner-of-ireland",
  ]);
  for (const id of Object.keys(BRAND_PROFILES)) assert.equal(isBrandId(id), true);
  assert.equal(isBrandId("other-business"), false);
});

test("defaults legacy profile lookup to Omega and rejects unknown brands", () => {
  assert.equal(getBrandProfile().id, "omega-financial");
  assert.throws(() => getBrandProfile("unknown"), { name: "BrandValidationError" });
});

test("uses only the supplied Graduation Hoodies palette", () => {
  assert.deepEqual(BRAND_PROFILES["graduation-hoodies"].palette, [
    "#120000",
    "#FFFFFF",
    "#EA581F",
    "#666666",
  ]);
  assert.deepEqual(BRAND_PROFILES["eco-car-wash"].palette, []);
  assert.deepEqual(BRAND_PROFILES["bonner-of-ireland"].palette, []);
});

test("non-Omega prompt contains only its brand's profile and supplied brief", () => {
  const { system, user } = buildBrandDraftPrompt(
    "eco-car-wash",
    { channel: "instagram", format: "single", profession: "", topic: "interior clean", tone: "friendly" },
    [],
    "ECO_SOURCE_ONLY: verified wash instructions",
  );
  assert.match(system, /Eco Car Wash/);
  assert.match(user, /interior clean/);
  assert.match(system + user, /ECO_SOURCE_ONLY/);
  assert.doesNotMatch(system + user, /Central Bank of Ireland|medical professionals|Omega Financial claims/);
  assert.match(system, /approved facts below or by an attached live source/);
});

test("each non-Omega brand gets its own factual and claim guardrails", () => {
  for (const id of ["graduation-hoodies", "eco-car-wash", "bonner-of-ireland"] as const) {
    const { system } = buildBrandDraftPrompt(id, {
      channel: "instagram", format: "single", profession: "", topic: "test", tone: "clear",
    }, []);
    assert.match(system, new RegExp(BRAND_PROFILES[id].name));
    assert.match(system, /Never invent prices, guarantees, partnerships, testimonials, service details, product claims, or results/);
    assert.doesNotMatch(system, /Central Bank of Ireland regulated firm/);
  }
});

test("Omega brand wrapper preserves the existing Omega prompt behavior", () => {
  const brief = { channel: "linkedin", format: "short", profession: "gp", topic: "pensions", tone: "warm" };
  const legacy = buildDraftPrompt(brief, []);
  const wrapped = buildBrandDraftPrompt("omega-financial", brief, []);
  assert.deepEqual(wrapped, legacy);
  assert.match(wrapped.system, /Central Bank of Ireland regulated firm/);
});
