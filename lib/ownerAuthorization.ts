import { cookies } from "next/headers";
import { normalizedEmail, STUDIO_SESSION_COOKIE, studioOwnerActorId, verifySessionToken } from "./studioAuth";

export type StudioOwner = { userId: string; email: string; displayName: string };

export type OwnerAuthorization =
  | { authorized: true; user: StudioOwner }
  | { authorized: false; response: Response };

function denied(status: 401 | 403, error: string): OwnerAuthorization {
  return {
    authorized: false,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    }),
  };
}

export async function requireAuthorizedStudioOwner(): Promise<OwnerAuthorization> {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(STUDIO_SESSION_COOKIE)?.value, process.env.STUDIO_SESSION_SECRET);
  const ownerEmail = process.env.STUDIO_OWNER_EMAIL;
  if (!session || !ownerEmail || session.email !== normalizedEmail(ownerEmail)) {
    return denied(401, "Sign in to use this workspace.");
  }
  return { authorized: true, user: { userId: studioOwnerActorId(session.email), email: session.email, displayName: session.email } };
}
