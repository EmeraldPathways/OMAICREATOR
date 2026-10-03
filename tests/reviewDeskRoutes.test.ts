import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mapReviewDeskPath, resolveReviewDeskBrandId } from "../lib/reviewDesk/routes.ts";
import { dispatchReviewDeskRequest } from "../lib/reviewDesk/adapter.ts";

function d1For(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      let params: unknown[] = [];
      return {
        bind(...values: unknown[]) { params = values; return this; },
        first() { return db.prepare(sql).get(...params) ?? null; },
      };
    },
  };
}

test("Review Desk adapter maps only its documented UI, OAuth, state, and action routes", () => {
  assert.equal(mapReviewDeskPath("/api/review-desk/ui", "GET"), "/");
  assert.equal(mapReviewDeskPath("/api/review-desk/state", "GET"), "/api/state");
  assert.equal(mapReviewDeskPath("/api/review-desk/oauth/start", "GET"), "/api/oauth/start");
  assert.equal(mapReviewDeskPath("/api/review-desk/oauth/callback", "GET"), "/oauth/callback");
  assert.equal(mapReviewDeskPath("/api/review-desk/approve", "POST"), "/api/approve");
  assert.equal(mapReviewDeskPath("/api/review-desk/publish", "POST"), "/api/publish");
  assert.equal(mapReviewDeskPath("/api/review-desk/login", "POST"), null);
  assert.equal(mapReviewDeskPath("/api/review-desk/state", "POST"), null);
  assert.equal(mapReviewDeskPath("/api/review-desk/unknown", "GET"), null);
  assert.equal(mapReviewDeskPath("/api/review-desk/webhooks/pubsub", "POST"), null);
});

test("OAuth callback brand is resolved only from unexpired state bound to the owner", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE rd_oauth_states(state TEXT PRIMARY KEY, brand_id TEXT, owner_email TEXT, verifier TEXT, expires INTEGER)");
  sqlite.prepare("INSERT INTO rd_oauth_states VALUES(?,?,?,?,?)").run("valid", "eco-car-wash", "owner@example.ie", "pkce", 2000);
  sqlite.prepare("INSERT INTO rd_oauth_states VALUES(?,?,?,?,?)").run("expired", "omega-financial", "owner@example.ie", "pkce", 500);
  const db = d1For(sqlite);

  assert.equal(await resolveReviewDeskBrandId(new URL("https://studio.test/api/review-desk/oauth/callback?state=valid"), "/api/review-desk/oauth/callback", "owner@example.ie", db, 1000), "eco-car-wash");
  await assert.rejects(resolveReviewDeskBrandId(new URL("https://studio.test/api/review-desk/oauth/callback?state=valid"), "/api/review-desk/oauth/callback", "other@example.ie", db, 1000), /expired|business/i);
  await assert.rejects(resolveReviewDeskBrandId(new URL("https://studio.test/api/review-desk/oauth/callback?state=expired"), "/api/review-desk/oauth/callback", "owner@example.ie", db, 1000), /expired|business/i);
  sqlite.close();
});

test("interactive routes reject missing, unknown, or mismatched business IDs", async () => {
  const db = { prepare() { throw new Error("The callback must not query this fake database."); } };
  await assert.rejects(resolveReviewDeskBrandId(new URL("https://studio.test/api/review-desk/state"), "/api/review-desk/state", "owner@example.ie", db), /business/i);
  await assert.rejects(resolveReviewDeskBrandId(new URL("https://studio.test/api/review-desk/state?brandId=another"), "/api/review-desk/state", "owner@example.ie", db), /business/i);
});

test("the same-origin adapter returns the protected UI for an owner and rejects anonymous access", async () => {
  const request = new Request("https://studio.test/api/review-desk/ui?brandId=bonner-of-ireland");
  const db = { prepare() { throw new Error("UI shell should not query review data before loading."); } } as never;
  const vars = {};
  const response = await dispatchReviewDeskRequest(request, "owner@example.ie", db, vars);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'self'/);
  assert.match(await response.text(), /bonner-of-ireland/);

  const anonymous = await dispatchReviewDeskRequest(request, "", db, vars);
  assert.equal(anonymous.status, 401);
});
