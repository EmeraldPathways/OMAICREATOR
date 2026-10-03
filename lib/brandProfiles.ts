import { CHANNELS, PROFESSIONS, VOICE } from "./brand";
import { FACTS } from "./facts";

export type BrandId = "omega-financial" | "graduation-hoodies" | "eco-car-wash" | "bonner-of-ireland";

export class BrandValidationError extends Error {
  constructor(id: string) {
    super(`Unknown brand: ${id}`);
    this.name = "BrandValidationError";
  }
}

export interface ImagePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface BrandProfile {
  id: BrandId;
  name: string;
  voice: string;
  audiences: string[];
  approvedFacts: string[];
  prohibitedClaims: string[];
  palette: string[];
  channels: string[];
  formats: string[];
  defaultImageStyle: string;
  defaultLighting: string;
  defaultComposition: string;
  avoidList: string[];
  imageModel: string;
  imagePresets: ImagePreset[];
  logoObjectKey: string | null;
  websiteUrl: string;
  gscSiteUrl: string;
  ga4PropertyId: string;
}

const imagePresets: ImagePreset[] = [
  { id: "square", label: "Square post", width: 1024, height: 1024 },
  { id: "portrait", label: "Portrait post", width: 1024, height: 1536 },
  { id: "landscape", label: "Landscape", width: 1536, height: 1024 },
  { id: "story", label: "Story", width: 1024, height: 1792 },
];

const omegaApprovedFacts = FACTS.filter((fact) => fact.status === "verified").map(
  (fact) => `${fact.id}: ${fact.label} — ${fact.value}`,
);

export const BRAND_PROFILES: Record<BrandId, BrandProfile> = {
  "omega-financial": {
    id: "omega-financial",
    name: "Omega Financial",
    voice: VOICE,
    audiences: PROFESSIONS.map((profession) => profession.name),
    approvedFacts: omegaApprovedFacts,
    prohibitedClaims: ["guaranteed outcomes", "unsubstantiated superiority", "invented testimonials"],
    palette: ["#661e24", "#4c161b", "#988b54", "#e1dece", "#ffffff", "#231c1d"],
    channels: CHANNELS.map((channel) => channel.id),
    formats: CHANNELS.flatMap((channel) => channel.formats.map((format) => format.id)),
    defaultImageStyle: "",
    defaultLighting: "",
    defaultComposition: "",
    avoidList: [],
    imageModel: "gpt-image-2.5-flare",
    imagePresets,
    logoObjectKey: null,
    websiteUrl: "https://www.omegafinancial.ie",
    gscSiteUrl: "",
    ga4PropertyId: "",
  },
  "graduation-hoodies": {
    id: "graduation-hoodies",
    name: "Graduation Hoodies",
    voice: "Professional, upbeat, clear, and helpful. Use British/Irish English.",
    audiences: ["Graduates", "Student groups", "Schools and colleges"],
    approvedFacts: [],
    prohibitedClaims: ["unverified delivery promises", "invented testimonials", "unverified prices or discounts"],
    palette: ["#120000", "#FFFFFF", "#EA581F", "#666666"],
    channels: ["instagram", "facebook", "linkedin", "email", "website"],
    formats: ["single post", "carousel", "story", "email", "product page", "blog article"],
    defaultImageStyle: "",
    defaultLighting: "",
    defaultComposition: "",
    avoidList: [],
    imageModel: "gpt-image-2.5-flare",
    imagePresets,
    logoObjectKey: null,
    websiteUrl: "https://www.graduationhoodies.ie",
    gscSiteUrl: "",
    ga4PropertyId: "",
  },
  "eco-car-wash": {
    id: "eco-car-wash",
    name: "Eco Car Wash",
    voice: "Clear, approachable, practical, and locally relevant.",
    audiences: ["Car owners", "Local customers", "Fleet customers"],
    approvedFacts: [],
    prohibitedClaims: ["unverified environmental claims", "invented service guarantees", "unverified prices or results"],
    palette: [],
    channels: ["instagram", "facebook", "linkedin", "email", "website"],
    formats: ["single post", "carousel", "story", "email", "service page", "blog article"],
    defaultImageStyle: "",
    defaultLighting: "",
    defaultComposition: "",
    avoidList: [],
    imageModel: "gpt-image-2.5-flare",
    imagePresets,
    logoObjectKey: null,
    websiteUrl: "https://ecocarwash.ie",
    gscSiteUrl: "",
    ga4PropertyId: "",
  },
  "bonner-of-ireland": {
    id: "bonner-of-ireland",
    name: "Bonner of Ireland",
    voice: "Clear, professional, and customer-focused.",
    audiences: [],
    approvedFacts: [],
    prohibitedClaims: ["unverified product, origin, sustainability, or performance claims", "invented testimonials"],
    palette: [],
    channels: ["instagram", "facebook", "linkedin", "email", "website"],
    formats: ["single post", "carousel", "story", "email", "product page", "blog article"],
    defaultImageStyle: "",
    defaultLighting: "",
    defaultComposition: "",
    avoidList: [],
    imageModel: "gpt-image-2.5-flare",
    imagePresets,
    logoObjectKey: null,
    websiteUrl: "https://bonnerofireland.com",
    gscSiteUrl: "",
    ga4PropertyId: "",
  },
};

export function isBrandId(id: unknown): id is BrandId {
  return typeof id === "string" && Object.hasOwn(BRAND_PROFILES, id);
}

export function getBrandProfile(id?: string): BrandProfile {
  if (id === undefined || id === "") return BRAND_PROFILES["omega-financial"];
  if (!isBrandId(id)) throw new BrandValidationError(id);
  return BRAND_PROFILES[id];
}
