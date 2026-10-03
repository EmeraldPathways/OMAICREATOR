import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { isReviewDeskBrandId, REVIEW_DESK_SCHEMA } from "../lib/reviewDesk/schema.ts";

test("Review Desk schema is namespaced and every stored record is brand-scoped", () => {
  const db = new DatabaseSync(":memory:");
  for (const statement of REVIEW_DESK_SCHEMA) db.exec(statement);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rd_%' ORDER BY name").all();
  assert.ok(tables.length >= 7);
  for (const { name } of tables) {
    assert.match(name, /^rd_/);
    const columns = db.prepare(`PRAGMA table_info(${name})`).all();
    assert.ok(columns.some((column) => column.name === "brand_id"), `${name} must be brand-scoped`);
  }
  db.close();
});

test("Review Desk accepts only known Content Studio brand IDs", () => {
  for (const brand of ["omega-financial", "graduation-hoodies", "bonner-of-ireland", "eco-car-wash"]) {
    assert.equal(isReviewDeskBrandId(brand), true);
  }
  for (const brand of ["", null, "another-brand", "omega-financial' OR 1=1--"]) {
    assert.equal(isReviewDeskBrandId(brand), false);
  }
});
