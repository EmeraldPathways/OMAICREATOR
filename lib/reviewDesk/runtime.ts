import { assertReviewDeskBrandId } from "./schema";
import type { BrandId } from "../brandProfiles";

interface RuntimeInput {
  brandId: unknown;
  ownerEmail: unknown;
  request: Request;
  db: unknown;
  vars?: Record<string, string | undefined>;
  publicWebhook?: boolean;
}

export function createReviewDeskEnv({ brandId, ownerEmail, request, db, vars = {}, publicWebhook = false }: RuntimeInput) {
  assertReviewDeskBrandId(brandId);
  const requestedBrand = new URL(request.url).searchParams.get("brandId");
  if (requestedBrand !== null && requestedBrand !== brandId) throw new Error("The requested business does not match the authorized Review Desk scope.");
  if (!publicWebhook && (typeof ownerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim()))) {
    throw new Error("A signed-in Content Studio owner is required.");
  }
  if (!db || typeof (db as { prepare?: unknown }).prepare !== "function") {
    throw new Error("The hosted database is unavailable. Check the D1 binding and redeploy.");
  }
  const requestUrl = new URL(request.url);
  if (requestUrl.protocol !== "https:") throw new Error("Review Desk requires an HTTPS origin.");

  return {
    DB: db,
    PUBLIC_BASE_URL: requestUrl.origin,
    BRAND_ID: brandId as BrandId,
    STUDIO_OWNER_EMAIL: typeof ownerEmail === "string" ? ownerEmail.trim().toLowerCase() : "",
    SITES_PRIVATE_AUTH: "1",
    SCHEDULED_WORK_ENABLED: vars.REVIEW_DESK_SCHEDULED_WORK_ENABLED === "1",
    OPENAI_API_KEY: vars.OPENAI_API_KEY,
    OPENAI_MODEL: vars.OPENAI_MODEL || vars.REVIEW_DESK_OPENAI_MODEL,
    GOOGLE_CLIENT_ID: vars.REVIEW_DESK_GOOGLE_CLIENT_ID || vars.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: vars.REVIEW_DESK_GOOGLE_CLIENT_SECRET || vars.GOOGLE_CLIENT_SECRET,
    TOKEN_KEY: vars.REVIEW_DESK_TOKEN_KEY,
    PUBSUB_TOPIC: vars.REVIEW_DESK_PUBSUB_TOPIC,
    PUSH_SERVICE_ACCOUNT: vars.REVIEW_DESK_PUSH_SERVICE_ACCOUNT,
    PUSH_AUDIENCE: vars.REVIEW_DESK_PUSH_AUDIENCE,
  };
}

export function createScheduledReviewDeskEnv(env: Record<string, unknown>) {
  const value = (key: string) => typeof env[key] === "string" ? env[key] as string : undefined;
  return {
    ...env,
    PUBLIC_BASE_URL: "https://omega-content-studio.emeraldpathways.chatgpt.site",
    GOOGLE_CLIENT_ID: value("REVIEW_DESK_GOOGLE_CLIENT_ID") || value("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: value("REVIEW_DESK_GOOGLE_CLIENT_SECRET") || value("GOOGLE_CLIENT_SECRET"),
    TOKEN_KEY: value("REVIEW_DESK_TOKEN_KEY"),
    OPENAI_MODEL: value("OPENAI_MODEL") || value("REVIEW_DESK_OPENAI_MODEL"),
    PUBSUB_TOPIC: value("REVIEW_DESK_PUBSUB_TOPIC"),
    PUSH_SERVICE_ACCOUNT: value("REVIEW_DESK_PUSH_SERVICE_ACCOUNT"),
    PUSH_AUDIENCE: value("REVIEW_DESK_PUSH_AUDIENCE"),
    SCHEDULED_WORK_ENABLED: true,
  };
}
