export const CONTENT_STATUSES = ["draft", "needs_review", "compliance_review", "approved", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function statusLabel(status: string) {
  return ({ draft: "Draft", needs_review: "Needs review", compliance_review: "Compliance review", approved: "Approved", archived: "Archived" } as Record<string, string>)[status] || status;
}

export function safeDisplayDate(value: string | null | undefined, includeTime = false) {
  if (!value || value === "CURRENT_TIMESTAMP") return "Date recorded in database";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date recorded in database";
  return date.toLocaleString("en-IE", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}
