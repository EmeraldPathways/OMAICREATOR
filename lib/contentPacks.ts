export interface ContentPack {
  id: string;
  name: string;
  category: "Income protection" | "Pensions";
  source: string;
  summary: string;
  prompts: string[];
}

export const CONTENT_PACKS: ContentPack[] = [
  { id: "vet-income", name: "Veterinarians", category: "Income protection", source: "Income Protection for Vets", summary: "Own-occupation protection for physically and mentally demanding veterinary work, including the effect of illness on practice income.", prompts: ["own occupation", "practice costs", "physical and mental capacity"] },
  { id: "physio-income", name: "Physiotherapists", category: "Income protection", source: "Income Protection for Physiotherapists", summary: "Protection shaped around mobility, strength, treatment work and the effect of injury on a physiotherapist's ability to earn.", prompts: ["physical reliance", "patient treatment", "lifestyle protection"] },
  { id: "gp-income", name: "General Practitioners", category: "Income protection", source: "Income Protection for General Practitioners", summary: "GMS, private and out-of-hours income, locum costs and the practical effect of absence on a GP principal.", prompts: ["GMS income", "locum costs", "principal GP"] },
  { id: "dentist-income", name: "Dentists", category: "Income protection", source: "Income Protection for Dentists", summary: "Precision, dexterity, stamina and the financial exposure of principal dentists without employer sick pay.", prompts: ["dexterity", "practice overheads", "principal dentist"] },
  { id: "hse-income", name: "HSE Professionals", category: "Income protection", source: "Income Protection for HSE Professionals", summary: "Employment terms, sick-pay limits and personal financial needs for HSE professionals.", prompts: ["sick-pay limits", "employment terms", "personal needs"] },
  { id: "consultant-income", name: "Medical Consultants", category: "Income protection", source: "Income Protection for Medical Consultants", summary: "HSE and private income, specialist expertise and the need to protect a consultant's established standard of living.", prompts: ["HSE income", "private practice", "own occupation"] },
  { id: "surveyor-income", name: "Chartered Surveyors", category: "Income protection", source: "Income Protection for Chartered Surveyors", summary: "Site inspections, technical work and the physical and mental capacity needed to maintain professional income.", prompts: ["site inspections", "technical work", "professional income"] },
  { id: "pharmacist-income", name: "Pharmacists", category: "Income protection", source: "Income Protection for Pharmacists", summary: "Standing, responsibility, pharmacy operations and the financial exposure of principal pharmacists.", prompts: ["pharmacy operations", "principal pharmacist", "staff responsibilities"] },
  { id: "pension-general", name: "Pensions overview", category: "Pensions", source: "Omega Pension Website Content", summary: "Career-stage pension planning, tax-efficient contributions and building financial security for retirement.", prompts: ["career stage", "tax-efficient strategy", "retirement income"] },
  { id: "gp-pension", name: "GP pensions", category: "Pensions", source: "Omega Pensions for GP's Overview", summary: "The hybrid GMS and personal pension picture, contributions, AVCs and the need to coordinate retirement planning.", prompts: ["GMS pension", "AVCs", "hybrid scheme"] },
  { id: "consultant-pension", name: "Consultant pensions", category: "Pensions", source: "Omega Pensions for Consultants Overview", summary: "Public service pension changes, consultant contracts and coordinating public and private retirement income.", prompts: ["public service pension", "consultant contract", "retirement income"] },
  { id: "dentist-pension", name: "Dentist pensions", category: "Pensions", source: "Omega Pensions for Dentists Overview", summary: "Personal pension planning, tax benefits and wealth management for dentists without a state-sponsored occupational scheme.", prompts: ["personal pension", "tax benefits", "wealth planning"] },
];

export function packFor(profession: string, topic: string) {
  const lower = topic.toLowerCase();
  const pension = lower.includes("pension") || lower.includes("retirement") || lower.includes("avc");
  const ids = pension ? { gp: "gp-pension", consultant: "consultant-pension", dentist: "dentist-pension" } : { gp: "gp-income", dentist: "dentist-income", consultant: "consultant-income", pharmacist: "pharmacist-income", vet: "vet-income", physiotherapist: "physio-income", hse: "hse-income", surveyor: "surveyor-income" };
  return CONTENT_PACKS.find((p) => p.id === ids[profession as keyof typeof ids]) || CONTENT_PACKS.find((p) => p.id === (pension ? "pension-general" : "gp-income"))!;
}
