"use client";
import { useEffect, useState } from "react";

interface ActivityEntry { id: number; action: string; entity_type: string; actor: string | null; detail: string | null; created_at: string }
export default function Activity({ brandId = "omega-financial" }: { brandId?: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/activity?brandId=${encodeURIComponent(brandId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Activity could not be loaded.");
        if (active) { setEntries(data.entries || []); setError(""); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Activity could not be loaded.");
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [brandId, reloadKey]);

  return <div className="column">
    <div className="prose" style={{ marginBottom: 16 }}><p>Recent changes across drafts, facts and professional knowledge. Use this as a lightweight review trail before publishing.</p></div>
    {busy ? <div className="busy" role="status"><span className="spinner" /> Loading activity</div>
      : error ? <div className="alert" role="alert">{error} <button className="btn btn-secondary" onClick={() => { setBusy(true); setError(""); setReloadKey((key) => key + 1); }}>Try again</button></div>
      : entries.length ? <div className="activity-list">{entries.map((entry) => <div className="activity-item" key={entry.id}><span className="activity-dot" /><div><strong>{entry.action}</strong><p>{entry.detail || entry.entity_type}{entry.actor ? ` · ${entry.actor}` : ""}</p></div><time>{new Date(entry.created_at).toLocaleString("en-IE")}</time></div>)}</div>
      : <div className="empty"><strong>No activity yet</strong><p>Changes will appear here as the team works in the studio.</p></div>}
  </div>;
}
