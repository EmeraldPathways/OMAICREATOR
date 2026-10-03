const BRAND_IDS = new Set(["omega-financial", "graduation-hoodies", "eco-car-wash", "bonner-of-ireland"]);

export function scopedWorkspaceKey(ownerEmail: string, brandId?: string | null) {
  const owner = ownerEmail.trim().toLowerCase();
  if (!owner) return "";
  return brandId && BRAND_IDS.has(brandId) ? `${owner}::${brandId}` : owner;
}

export function queryWorkspaceKey(request: Request) {
  return scopedWorkspaceKey(
    request.headers.get("x-studio-owner-email") || "",
    new URL(request.url).searchParams.get("brandId"),
  );
}

export function payloadWorkspaceKey(ownerEmail: string, brandId: unknown) {
  return scopedWorkspaceKey(ownerEmail, typeof brandId === "string" ? brandId : null);
}
