"use client";

import { useEffect, useState } from "react";
import { ROLES } from "@/lib/db";

interface Item {
  id: number;
  channel: string;
  format: string;
  profession: string;
  topic: string;
  status: string;
  risk_score: number | null;
  due_on: string | null;
  approved_by: string;
  approver_role: string | null;
  campaign_name: string | null;
  excerpt: string;
  version_count: number;
}

interface Version {
  id: number;
  version_no: number;
  body: string;
  action: string;
  actor: string;
  actor_role: string;
  risk_score: number | null;
  created_at: string;
}

const band = (s: number | null) =>
  s === null ? "none" : s === 0 ? "clean" : s < 20 ? "low" : s < 50 ? "medium" : s < 75 ? "high" : "severe";

export default function Queue() {
  const [items, setItems] = useState<Item[]>([]);
  const [connected, setConnected] = useState(true);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState("");
  const [actor, setActor] = useState("");
  const [role, setRole] = useState("compliance");
  const [history, setHistory] = useState<{ id: number; versions: Version[] } | null>(null);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/api/queue");
      const j = await res.json();
      setConnected(j.connected !== false);
      setItems(j.items || []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function move(id: number, status: string) {
    if (!actor.trim()) {
      setMsg("Put your name in before moving anything. An approval with no name attached is not an approval.");
      return;
    }
    setMsg("");
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, actor, role }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    load();
  }

  async function openHistory(id: number) {
    if (history?.id === id) { setHistory(null); return; }
    const res = await fetch(`/api/versions?id=${id}`);
    const j = await res.json();
    setHistory({ id, versions: j.versions || [] });
  }

  if (!connected) {
    return (
      <div className="column">
        <div className="empty">
          <strong>The queue needs a database</strong>
          <p>Add Neon in Vercel under Storage, then create the tables from the Library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="column">
      {msg && <div className="alert">{msg}</div>}

      <section className="panel">
        <div className="panel-head"><h2>Reviewing as</h2></div>
        <div className="panel-body">
          <div className="btn-row">
            <input
              type="text" value={actor} onChange={(e) => setActor(e.target.value)}
              placeholder="Your name" style={{ maxWidth: 200 }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ maxWidth: 260 }}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.can}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "11px 0 0" }}>
            This records who did what. It does not verify who you are — until the
            app sits behind your SSO, treat it as an attestation rather than an
            authenticated approval.
          </p>
        </div>
      </section>

      {busy && <div className="busy"><span className="spinner" /> Loading the queue</div>}

      {!busy && !items.length && (
        <div className="empty">
          <strong>Nothing waiting</strong>
          <p>Pieces submitted for review appear here, worst risk score first, then by deadline.</p>
        </div>
      )}

      {items.map((it) => (
        <section className="panel" key={it.id}>
          <div className="panel-head">
            <h2>{it.topic}</h2>
            <span className="hint">
              {it.channel} · {it.profession}
              {it.campaign_name ? ` · ${it.campaign_name}` : ""}
              {it.due_on ? ` · due ${String(it.due_on).slice(0, 10)}` : ""}
            </span>
          </div>
          <div className="panel-body">
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <span className={`score score-${band(it.risk_score)}`}>
                {it.risk_score === null ? "unscored" : `risk ${it.risk_score}`}
              </span>
              <span className="pill disputed">{it.status}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                {it.version_count} {it.version_count === 1 ? "version" : "versions"}
              </span>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)" }}>{it.excerpt}…</p>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => move(it.id, "approved")}>Approve</button>
              <button className="btn btn-secondary" onClick={() => move(it.id, "changes_requested")}>Request changes</button>
              <button className="btn btn-secondary" onClick={() => move(it.id, "blocked")}>Block</button>
              <button className="btn-quiet" onClick={() => openHistory(it.id)}>
                {history?.id === it.id ? "Hide history" : "History"}
              </button>
            </div>

            {history?.id === it.id && (
              <div className="ledger-group" style={{ marginTop: 16 }}>
                <h3>Version history</h3>
                {!history.versions.length && (
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>No versions recorded yet.</p>
                )}
                {history.versions.map((v) => (
                  <div className="rule-row" key={v.id}>
                    <span className="tick pass">{v.version_no}</span>
                    <div>
                      <b>{v.action.replace(/_/g, " ")}</b>
                      <em>
                        {v.actor} ({v.actor_role}) · {new Date(v.created_at).toISOString().slice(0, 16).replace("T", " ")}
                        {v.risk_score !== null ? ` · risk ${v.risk_score}` : ""}
                      </em>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
