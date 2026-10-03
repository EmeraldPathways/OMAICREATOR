import { createReviewDeskEnv } from "./runtime";
import { mapReviewDeskPath, resolveReviewDeskBrandId } from "./routes";
import { ensureReviewDeskSchema, isReviewDeskBrandId } from "./schema";
import worker from "./worker.js";

const noStore = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

export async function dispatchReviewDeskRequest(request: Request, ownerEmail: string, db: D1Database, vars: Record<string, string | undefined>) {
  const requestUrl = new URL(request.url);
  const upstreamPath = mapReviewDeskPath(requestUrl.pathname, request.method);
  if (!upstreamPath) return Response.json({ error: "Review Desk route not found." }, { status: 404, headers: noStore });

  try {
    if (!ownerEmail.trim()) throw new Error("A signed-in Content Studio owner is required.");
    if (upstreamPath !== "/") await ensureReviewDeskSchema(db);
    const brandId = await resolveReviewDeskBrandId(requestUrl, requestUrl.pathname, ownerEmail, db);
    if (!isReviewDeskBrandId(brandId)) return Response.json({ error: "Select a valid Content Studio business." }, { status: 400, headers: noStore });
    const runtime = createReviewDeskEnv({ brandId, ownerEmail, request, db, vars });
    const internalUrl = new URL(upstreamPath, requestUrl.origin);
    for (const [key, value] of requestUrl.searchParams) if (key !== "brandId") internalUrl.searchParams.append(key, value);
    const forwarded = new Request(internalUrl, request);
    return await worker.fetch(forwarded, runtime);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review Desk request failed.";
    return Response.json({ error: message.slice(0, 300) }, { status: /required|sign-in|signed-in/i.test(message) ? 401 : 400, headers: noStore });
  }
}

export async function dispatchReviewDeskWebhook(request: Request, db: D1Database, vars: Record<string, string | undefined>) {
  const requestUrl = new URL(request.url);
  const runtime = createReviewDeskEnv({
    brandId: "omega-financial",
    request,
    db,
    vars,
    publicWebhook: true,
  });
  const internalUrl = new URL("/webhooks/pubsub", requestUrl.origin);
  const forwarded = new Request(internalUrl, request);
  return await worker.fetch(forwarded, runtime);
}
