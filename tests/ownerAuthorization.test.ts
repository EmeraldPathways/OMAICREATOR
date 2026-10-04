import assert from "node:assert/strict";
import test from "node:test";

import { normalizedEmail, studioOwnerActorId } from "../lib/studioAuth.ts";

test("normalizes the single configured owner email for matching", () => {
  assert.equal(normalizedEmail("  Owner@Example.COM "), "owner@example.com");
});

test("uses the normalized owner email as a stable database actor ID", () => {
  assert.equal(studioOwnerActorId("  Owner@Example.COM "), "owner@example.com");
});
