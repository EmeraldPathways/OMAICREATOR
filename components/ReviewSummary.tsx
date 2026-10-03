interface ReviewSummaryProps {
  audit: { verdict: string; summary: string; claims: { status: string }[]; compliance: { status: string }[] };
}

export default function ReviewSummary({ audit }: ReviewSummaryProps) {
  const passed = [...audit.claims, ...audit.compliance].filter((item) => item.status === "pass" || item.status === "verified" || item.status === "clear").length;
  const total = audit.claims.length + audit.compliance.length;
  return <div className={`review-summary ${audit.verdict}`}>
    <div><strong>{audit.verdict === "ready" ? "Ready for sign-off" : audit.verdict === "block" ? "Blocked pending changes" : "Review recommended"}</strong><span>{passed} of {total} checks clear</span></div>
    <p>{audit.summary}</p>
  </div>;
}
