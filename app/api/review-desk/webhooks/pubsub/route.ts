import { env } from "cloudflare:workers";
import { dispatchReviewDeskWebhook } from "@/lib/reviewDesk/adapter";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: "Review Desk storage is unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  try {
    return await dispatchReviewDeskWebhook(request, env.DB, process.env);
  } catch {
    return Response.json({ error: "Review notification could not be processed." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
