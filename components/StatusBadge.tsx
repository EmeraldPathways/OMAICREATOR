import { statusLabel } from "@/lib/uiState";

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}><span aria-hidden="true">{status === "approved" ? "✓" : status === "archived" ? "—" : "•"}</span> {statusLabel(status)}</span>;
}
