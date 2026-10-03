import type { BrandProfile } from "./brandProfiles";

export const RANKSCOPE_ORIGIN = "https://omega-content-studio.emeraldpathways.chatgpt.site";
export const RANKSCOPE_VIEWS = [
  "Overview", "Keywords", "Keyword Gap", "Competitors", "Rank Tracker", "Backlinks",
  "Site Audit", "On-Page SEO", "Topic Research", "Writing Assistant", "Content Briefs", "Reports", "Integrations",
] as const;
export type RankScopeView = (typeof RANKSCOPE_VIEWS)[number];

export function rankScopeUrl(profile: Pick<BrandProfile, "id" | "websiteUrl" | "gscSiteUrl" | "ga4PropertyId">, view: string) {
  const url = new URL("/rankscope", typeof window === "undefined" ? RANKSCOPE_ORIGIN : window.location.origin);
  url.searchParams.set("embed", "1");
  url.searchParams.set("brandId", profile.id);
  url.searchParams.set("view", (RANKSCOPE_VIEWS as readonly string[]).includes(view) ? view : "Overview");
  try { url.searchParams.set("domain", new URL(profile.websiteUrl).hostname.replace(/^www\./, "")); } catch { /* website URL is validated in brand settings */ }
  if (profile.gscSiteUrl) url.searchParams.set("gscSiteUrl", profile.gscSiteUrl);
  if (profile.ga4PropertyId) url.searchParams.set("ga4PropertyId", profile.ga4PropertyId);
  return url.toString();
}
