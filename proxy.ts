import { NextRequest, NextResponse } from "next/server";
import { isAuthConfigured, isPublicAuthRequest, normalizedEmail, STUDIO_SESSION_COOKIE, verifySessionToken } from "./lib/studioAuth";
import { isReviewDeskPubSubRequest } from "./lib/reviewDesk/routes";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicAuthRequest(pathname, request.method)) return NextResponse.next();
  if (isReviewDeskPubSubRequest(pathname, request.method)) return NextResponse.next();

  const configured = isAuthConfigured();
  const session = configured
    ? await verifySessionToken(request.cookies.get(STUDIO_SESSION_COOKIE)?.value, process.env.STUDIO_SESSION_SECRET)
    : null;
  const ownerEmail = process.env.STUDIO_OWNER_EMAIL;
  if (session && ownerEmail && session.email === normalizedEmail(ownerEmail)) {
    const headers = new Headers(request.headers);
    headers.set("x-studio-owner-email", session.email);
    return NextResponse.next({ request: { headers } });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: configured ? "Sign in to use this workspace." : "Owner sign-in is not configured." }, {
      status: configured ? 401 : 503,
      headers: { "cache-control": "no-store" },
    });
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
