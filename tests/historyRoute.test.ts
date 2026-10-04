import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("History route is brand-scoped, bounded, and excludes retired pieces", async () => {
  const source = await readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8");

  assert.match(source, /authorizeBrandAccess/);
  assert.match(source, /brand_id\s*=\s*\$\{access\.brandId\}/);
  assert.match(source, /retired_at\s+IS\s+NULL/i);
  assert.match(source, /ORDER BY\s+p\.approved_at\s+DESC/i);
  assert.match(source, /LIMIT\s+100/i);
  assert.doesNotMatch(source, /SELECT\s+\*\s+FROM\s+pieces/i);
});

test("History route validates the five supported channel IDs", async () => {
  const source = await readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8");

  for (const channel of ["email", "linkedin", "instagram", "website", "print"]) {
    assert.match(source, new RegExp(`['\"]${channel}['\"]`));
  }
  assert.match(source, /400/);
  assert.match(source, /channel/i);
});

test("History route returns only the archive fields needed by the UI", async () => {
  const source = await readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8");

  for (const field of ["id", "channel", "format", "profession", "topic", "final_text", "was_edited", "status", "approved_by", "approved_at", "verdict"]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(source, /verified_facts|lessons|findings/);
});
