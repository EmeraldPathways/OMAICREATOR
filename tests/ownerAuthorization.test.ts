import assert from "node:assert/strict";
import test from "node:test";

import { normalizedEmail } from "../lib/studioAuth.ts";

test("normalizes the single configured owner email for matching", () => {
  assert.equal(normalizedEmail("  Owner@Example.COM "), "owner@example.com");
});
