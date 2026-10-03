"use client";
import { useEffect, useState } from "react";

interface ActivityEntry { id: number; action: string; entity_type: string; actor: string | null; detail: string | null; created_at: string }
export default function Activity({ brandId = "omega-financial" }: { brandId?: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [busy, setBusy] = useState(true);
  useEffect(() => { setBusy(true); fetch(`/api/activity?brandId=${encodeURIComponent(brandId)}`).then((r) => r.json()).then((j) => setEntries(j.entries || [])).finally(() => setBusy(false)); }, [brandId]);
  return <div className="column"><div className="prose" style={{ marginBottom: 16 }}><p>Recent changes across drafts, facts and professional knowledge. Use this as a lightweight review trail before publishing.</p></div>{busy ? <div className="busy"><span className="spinner" /> Loading activity</div> : entries.length ? <div className="activity-list">{entries.map((entry) => <div className="activity-item" key={entry.id}><span className="activity-dot" /><div><strong>{entry.action}</strong><p>{entry.detail || entry.entity_type}{entry.actor ? ` · ${entry.actor}` : ""}</p></div><time>{new Date(entry.created_at).toLocaleString("en-IE")}</time></div>)}</div> : <div className="empty"><strong>No activity yet</strong><p>Changes will appear here as the team works in the studio.</p></div>}</div>;
}
