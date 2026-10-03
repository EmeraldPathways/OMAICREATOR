import assert from "node:assert/strict";
import test from "node:test";
import { reviewDeskUiUrl } from "../lib/reviewDesk/embed.ts";

test("Review Desk frame embeds only the selected Content Studio brand", () => {
  assert.equal(reviewDeskUiUrl("bonner-of-ireland"), "/api/review-desk/ui?brandId=bonner-of-ireland");
  assert.equal(reviewDeskUiUrl("eco-car-wash"), "/api/review-desk/ui?brandId=eco-car-wash");
  assert.throws(() => reviewDeskUiUrl("another-business"), /business/i);
});
