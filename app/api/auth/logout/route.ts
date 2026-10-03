import { NextResponse } from "next/server";
import { STUDIO_SESSION_COOKIE } from "@/lib/studioAuth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Sign-out request could not be verified." }, { status: 403 });
  }
  const response = NextResponse.json({ signedIn: false }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(STUDIO_SESSION_COOKIE, "", { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
