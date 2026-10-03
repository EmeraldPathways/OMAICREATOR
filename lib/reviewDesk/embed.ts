import { isReviewDeskBrandId } from "./schema";

export function reviewDeskUiUrl(brandId: unknown): string {
  if (!isReviewDeskBrandId(brandId)) throw new Error("Select a valid Content Studio business.");
  return `/api/review-desk/ui?brandId=${encodeURIComponent(brandId)}`;
}
