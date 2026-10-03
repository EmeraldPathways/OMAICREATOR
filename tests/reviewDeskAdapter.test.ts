import assert from "node:assert/strict";
import test from "node:test";
import { createReviewDeskEnv, createScheduledReviewDeskEnv } from "../lib/reviewDesk/runtime.ts";

const request = new Request("https://studio.example.ie/api/review-desk/state?brandId=eco-car-wash");

test("builds a Review Desk runtime from trusted Studio identity and existing providers", () => {
  const db = { prepare() {} };
  const runtime = createReviewDeskEnv({
    brandId: "eco-car-wash",
    ownerEmail: "Owner@Example.ie",
    request,
    db,
    vars: {
      OPENAI_API_KEY: "openai-server-secret",
      OPENAI_MODEL: "gpt-4.1-mini",
      REVIEW_DESK_TOKEN_KEY: "google-token-encryption-secret",
      REVIEW_DESK_GOOGLE_CLIENT_ID: "google-client-id",
      REVIEW_DESK_GOOGLE_CLIENT_SECRET: "google-client-secret",
    },
  });

  assert.equal(runtime.DB, db);
  assert.equal(runtime.PUBLIC_BASE_URL, "https://studio.example.ie");
  assert.equal(runtime.BRAND_ID, "eco-car-wash");
  assert.equal(runtime.STUDIO_OWNER_EMAIL, "owner@example.ie");
  assert.equal(runtime.SITES_PRIVATE_AUTH, "1");
  assert.equal(runtime.OPENAI_API_KEY, "openai-server-secret");
  assert.equal(runtime.TOKEN_KEY, "google-token-encryption-secret");
  assert.equal(runtime.GOOGLE_CLIENT_ID, "google-client-id");
  assert.equal(runtime.GOOGLE_CLIENT_SECRET, "google-client-secret");
  assert.equal(runtime.SCHEDULED_WORK_ENABLED, false);
});

test("refuses an unknown brand and an insecure public origin", () => {
  assert.throws(() => createReviewDeskEnv({ brandId: "other", ownerEmail: "owner@example.ie", request, db: {}, vars: {} }), /business/i);
  assert.throws(() => createReviewDeskEnv({
    brandId: "omega-financial",
    ownerEmail: "owner@example.ie",
    request: new Request("http://studio.example.ie/api/review-desk/state"),
    db: { prepare() {} },
    vars: {},
  }), /HTTPS/i);
});

test("missing optional Google credentials are reported as disconnected, not fatal", () => {
  const runtime = createReviewDeskEnv({ brandId: "eco-car-wash", ownerEmail: "owner@example.ie", request, db: { prepare() {} }, vars: {} });
  assert.equal(runtime.GOOGLE_CLIENT_ID, undefined);
  assert.equal(runtime.GOOGLE_CLIENT_SECRET, undefined);
  assert.equal(runtime.TOKEN_KEY, undefined);
});

test("scheduled automation is available only when the Site host explicitly enables it", () => {
  const runtime = createReviewDeskEnv({
    brandId: "eco-car-wash", ownerEmail: "owner@example.ie", request, db: { prepare() {} },
    vars: { REVIEW_DESK_SCHEDULED_WORK_ENABLED: "1" },
  });
  assert.equal(runtime.SCHEDULED_WORK_ENABLED, true);
});

test("scheduled Worker runtime maps Site bindings and enables automation only for its cron entry", () => {
  const db = { prepare() {} };
  const runtime = createScheduledReviewDeskEnv({
    DB: db,
    OPENAI_API_KEY: "openai-key",
    OPENAI_MODEL: "gpt-4.1-mini",
    REVIEW_DESK_TOKEN_KEY: "token-key",
    REVIEW_DESK_GOOGLE_CLIENT_ID: "google-id",
    REVIEW_DESK_GOOGLE_CLIENT_SECRET: "google-secret",
    REVIEW_DESK_PUBSUB_TOPIC: "topic",
    REVIEW_DESK_PUSH_SERVICE_ACCOUNT: "service-account",
    REVIEW_DESK_PUSH_AUDIENCE: "audience",
  });
  assert.equal(runtime.DB, db);
  assert.equal(runtime.PUBLIC_BASE_URL, "https://omega-content-studio.emeraldpathways.chatgpt.site");
  assert.equal(runtime.GOOGLE_CLIENT_ID, "google-id");
  assert.equal(runtime.GOOGLE_CLIENT_SECRET, "google-secret");
  assert.equal(runtime.TOKEN_KEY, "token-key");
  assert.equal(runtime.SCHEDULED_WORK_ENABLED, true);
});
