import assert from "node:assert/strict";
import test from "node:test";
import { isReviewDeskPubSubRequest } from "../lib/reviewDesk/routes.ts";
import { dispatchReviewDeskWebhook } from "../lib/reviewDesk/adapter.ts";

test("only the exact Pub/Sub POST endpoint is allowed through the Studio session proxy", () => {
  assert.equal(isReviewDeskPubSubRequest("/api/review-desk/webhooks/pubsub", "POST"), true);
  assert.equal(isReviewDeskPubSubRequest("/api/review-desk/webhooks/pubsub", "GET"), false);
  assert.equal(isReviewDeskPubSubRequest("/api/review-desk/webhooks/pubsub/extra", "POST"), false);
  assert.equal(isReviewDeskPubSubRequest("/api/review-desk/state", "POST"), false);
});

test("the public Pub/Sub exception still rejects unauthenticated pushes before touching storage", async () => {
  const db = { prepare() { throw new Error("Invalid pushes must not touch D1."); } } as never;
  const request = new Request("https://studio.example.ie/api/review-desk/webhooks/pubsub", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer invalid" },
    body: JSON.stringify({ message: { data: "e30=" } }),
  });
  const response = await dispatchReviewDeskWebhook(request, db, {});
  assert.equal(response.status, 401);
});
