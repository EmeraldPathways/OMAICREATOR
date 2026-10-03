import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAuthConfigured, normalizedEmail, STUDIO_SESSION_COOKIE, verifySessionToken } from "@/lib/studioAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isAuthConfigured();
  const cookieStore = await cookies();
  const session = configured
    ? await verifySessionToken(cookieStore.get(STUDIO_SESSION_COOKIE)?.value, process.env.STUDIO_SESSION_SECRET)
    : null;
  const signedIn = Boolean(session && session.email === normalizedEmail(process.env.STUDIO_OWNER_EMAIL ?? ""));
  return NextResponse.json({
    configured,
    signedIn,
    isOwner: signedIn,
    displayName: signedIn ? session?.email ?? null : null,
    signInHref: "/login",
  }, { headers: { "cache-control": "private, no-store" } });
}
