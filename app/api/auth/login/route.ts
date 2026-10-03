import { NextResponse } from "next/server";
import { createSessionToken, isAuthConfigured, normalizedEmail, STUDIO_SESSION_COOKIE, STUDIO_SESSION_TTL_MS, verifyOwnerPassword } from "@/lib/studioAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Sign-in request could not be verified." }, { status: 403 });
  if (!isAuthConfigured()) return NextResponse.json({ error: "Owner sign-in is not configured." }, { status: 503 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Use the sign-in form to continue." }, { status: 415 });
  }

  let credentials: { email?: unknown; password?: unknown };
  try {
    credentials = await request.json() as typeof credentials;
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const email = typeof credentials.email === "string" ? normalizedEmail(credentials.email) : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";
  if (email.length > 254 || password.length > 1024 || !email || !password) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const configuredEmail = normalizedEmail(process.env.STUDIO_OWNER_EMAIL ?? "");
  const emailMatches = email === configuredEmail;
  const passwordMatches = await verifyOwnerPassword(password);
  if (!emailMatches || !passwordMatches) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const token = await createSessionToken(configuredEmail, process.env.STUDIO_SESSION_SECRET!);
  const response = NextResponse.json({ signedIn: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(STUDIO_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: STUDIO_SESSION_TTL_MS / 1000,
  });
  return response;
}

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
