import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { REVIEW_DESK_SCHEMA } from "../lib/reviewDesk/schema.ts";
import { getReview, ingest } from "../lib/reviewDesk/data.js";

function d1For(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      let params: unknown[] = [];
      return {
        bind(...values: unknown[]) { params = values; return this; },
        first() { return db.prepare(sql).get(...params) ?? null; },
        all() { return { results: db.prepare(sql).all(...params) }; },
        run() {
          const result = db.prepare(sql).run(...params);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
  };
}

test("the same Google review identifier is stored independently for two brands", async () => {
  const sqlite = new DatabaseSync(":memory:");
  for (const statement of REVIEW_DESK_SCHEMA) sqlite.exec(statement);
  const env = { DB: d1For(sqlite) };
  const location = "accounts/123/locations/456";
  const review = {
    name: `${location}/reviews/same-review`,
    reviewId: "same-review",
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
    starRating: "FIVE",
    comment: "A customer review",
    reviewer: { displayName: "Customer" },
  };

  await ingest({ brandId: "omega-financial" }, env, review, location);
  await ingest({ brandId: "eco-car-wash" }, env, review, location);

  assert.equal((await getReview({ brandId: "omega-financial" }, env, review.name)).text, "A customer review");
  assert.equal((await getReview({ brandId: "eco-car-wash" }, env, review.name)).text, "A customer review");
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM rd_reviews WHERE id=?").get(review.name).n, 2);
  sqlite.close();
});

test("Review Desk refuses unknown brands before looking up their records", async () => {
  const sqlite = new DatabaseSync(":memory:");
  for (const statement of REVIEW_DESK_SCHEMA) sqlite.exec(statement);
  const env = { DB: d1For(sqlite) };
  await assert.rejects(getReview({ brandId: "not-a-brand" }, env, "accounts/123/locations/456/reviews/r1"), /business/i);
  sqlite.close();
});
