export const ROLES = [
  { id: "marketer", name: "Marketing", can: "draft and submit for review" },
  { id: "compliance", name: "Compliance", can: "review, approve or block" },
  { id: "advisor", name: "Advisor", can: "sign off on technical accuracy" },
] as const;

export type Role = (typeof ROLES)[number]["id"];
