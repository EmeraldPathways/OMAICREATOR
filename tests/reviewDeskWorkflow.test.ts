import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT, eligible, replyGuard, riskReason, validateSettings } from "../lib/reviewDesk/core.js";
import { sealToken, unsealToken } from "../lib/reviewDesk/security.js";
import { assertAutomationScheduler, handleReviewDeskRequest } from "../lib/reviewDesk/worker.js";

test("publishing automation requires fresh express consent and defaults off", () => {
  assert.equal(DEFAULT.auto_mode, "off");
  assert.equal(DEFAULT.publish_consent, false);
  const draftMode = validateSettings(DEFAULT, { auto_mode: "draft" });
  assert.throws(() => validateSettings(draftMode, { auto_mode: "publish" }), /confirm/i);
  const saved = validateSettings(draftMode, { auto_mode: "publish", confirm_auto_publish: true });
  assert.equal(saved.publish_consent, true);
  assert.equal(validateSettings(saved, { auto_mode: "publish", threshold: 5 }).publish_consent, true);
});

test("automatic review modes stay disabled until the host scheduler is available", () => {
  assert.throws(() => assertAutomationScheduler({ auto_mode: "draft" }, {}), /background automation is not configured/i);
  assert.throws(() => assertAutomationScheduler({ auto_mode: "publish" }, {}), /background automation is not configured/i);
  assert.doesNotThrow(() => assertAutomationScheduler({ auto_mode: "off" }, {}));
  assert.doesNotThrow(() => assertAutomationScheduler({ auto_mode: "draft" }, { SCHEDULED_WORK_ENABLED: true }));
});

test("complaints and unsafe reply content stay out of automatic publishing", () => {
  const settings = { ...DEFAULT, words_avoid: "guaranteed" };
  const complaint = { rating: 5, text: "The service was good but the refund is still late." };
  assert.match(riskReason(complaint), /sensitive/i);
  assert.equal(eligible(complaint, settings), false);
  assert.match(replyGuard("We guarantee a refund: https://example.ie", settings), /link|avoid/i);
});

test("Google refresh tokens round-trip only through the configured encryption key", async () => {
  const env = { TOKEN_KEY: Buffer.alloc(32, 9).toString("base64") };
  const sealed = await sealToken("refresh-token", env);
  assert.notEqual(sealed, "refresh-token");
  assert.equal(await unsealToken(sealed, env), "refresh-token");
  await assert.rejects(unsealToken(sealed, { TOKEN_KEY: Buffer.alloc(32, 8).toString("base64") }));
});

test("hosted Review Desk UI uses the Studio session boundary and brand-scoped routes", async () => {
  const base = { DB: { prepare() {} }, PUBLIC_BASE_URL: "https://studio.example.ie", BRAND_ID: "eco-car-wash", SITES_PRIVATE_AUTH: "1" };
  const blocked = await handleReviewDeskRequest(new Request("https://studio.example.ie/"), base);
  assert.equal(blocked.status, 401);
  assert.equal((await blocked.text()).includes("Access password"), false);

  const allowed = await handleReviewDeskRequest(new Request("https://studio.example.ie/"), { ...base, STUDIO_OWNER_EMAIL: "owner@example.ie" });
  const html = await allowed.text();
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(html.includes("/api/review-desk/state?brandId="), true);
  assert.equal(html.includes("window.REVIEW_DESK_BRAND_ID=\"eco-car-wash\""), true);
  assert.equal(html.includes("data-action=\"logout\""), false);
  assert.equal(html.includes("Hosted checks run every five minutes"), false);
  assert.equal(html.includes("Background automation is not configured for this Site"), true);
});
