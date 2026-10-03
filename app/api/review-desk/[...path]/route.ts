import { env } from "cloudflare:workers";
import { requireAuthorizedStudioOwner } from "@/lib/ownerAuthorization";
import { dispatchReviewDeskRequest } from "@/lib/reviewDesk/adapter";

export const runtime = "nodejs";
export const maxDuration = 30;

async function handle(request: Request) {
  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return authorization.response;
  if (!env.DB) return Response.json({ error: "The hosted D1 database is unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  return dispatchReviewDeskRequest(request, authorization.user.email, env.DB, process.env);
}

export const GET = handle;
export const POST = handle;
