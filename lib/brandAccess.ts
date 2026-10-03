import { NextResponse } from "next/server";
import { isBrandId, type BrandId } from "./brandProfiles";
import { requireAuthorizedStudioOwner } from "./ownerAuthorization";

export type BrandAccess =
  | { ok: true; brandId: BrandId; actor: string | null }
  | { ok: false; response: Response };

export async function authorizeBrandAccess(value: unknown): Promise<BrandAccess> {
  if (value === undefined) return { ok: true, brandId: "omega-financial", actor: null };
  if (!isBrandId(value)) {
    return { ok: false, response: NextResponse.json({ error: "Choose a supported brand." }, { status: 400 }) };
  }
  if (value === "omega-financial") return { ok: true, brandId: value, actor: null };

  const authorization = await requireAuthorizedStudioOwner();
  if (!authorization.authorized) return { ok: false, response: authorization.response };
  return { ok: true, brandId: value, actor: authorization.user.userId };
}
