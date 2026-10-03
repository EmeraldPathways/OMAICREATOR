import { isReviewDeskBrandId } from "./schema";

const actions = new Set([
  "settings", "sample", "discover", "sync", "notifications", "disconnect", "location",
  "example-add", "example-delete", "draft", "save", "approve", "publish", "simulate",
]);

export function mapReviewDeskPath(pathname: string, method: string): string | null {
  const verb = method.toUpperCase();
  if (verb === "GET") {
    if (pathname === "/api/review-desk/ui") return "/";
    if (pathname === "/api/review-desk/state") return "/api/state";
    if (pathname === "/api/review-desk/oauth/start") return "/api/oauth/start";
    if (pathname === "/api/review-desk/oauth/callback") return "/oauth/callback";
  }
  if (verb === "POST") {
    const match = pathname.match(/^\/api\/review-desk\/([a-z-]+)$/);
    if (match && actions.has(match[1])) return `/api/${match[1]}`;
  }
  return null;
}

export function isReviewDeskPubSubRequest(pathname: string, method: string): boolean {
  return pathname === "/api/review-desk/webhooks/pubsub" && method.toUpperCase() === "POST";
}

export async function resolveReviewDeskBrandId(url: URL, pathname: string, ownerEmail: string, db: D1Database, now = Date.now()) {
  if (!ownerEmail.trim()) throw new Error("A signed-in Content Studio owner is required.");
  if (pathname === "/api/review-desk/oauth/callback") {
    const state = url.searchParams.get("state") || "";
    const row = await db.prepare("SELECT brand_id, expires FROM rd_oauth_states WHERE state=? AND owner_email=? AND expires>?")
      .bind(state, ownerEmail.trim().toLowerCase(), now).first<{ brand_id: string; expires: number }>();
    if (!row || !isReviewDeskBrandId(row.brand_id)) throw new Error("Google sign-in expired or belongs to a different business. Start again from Connections.");
    return row.brand_id;
  }
  const brandId = url.searchParams.get("brandId");
  if (!isReviewDeskBrandId(brandId)) throw new Error("Select a valid Content Studio business.");
  return brandId;
}
