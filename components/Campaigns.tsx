"use client";

import { useEffect, useState } from "react";
import { PROFESSIONS } from "@/lib/brand";

interface Campaign {
  id: number;
  name: string;
  profession: string;
  objective: string | null;
  theme: string | null;
  layer: string;
  starts_on: string | null;
  ends_on: string | null;
  brief: string | null;
  piece_count: number;
  approved_count: number;
}

interface PlanRow { channel: string; channelName: string; format: string; role: string }

export default function Campaigns({ onUse }: { onUse: (c: Campaign) => void }) {
  const [list, setList] = useState<Campaign[]>([]);
  const [connected, setConnected] = useState(true);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState("");
  const [plan, setPlan] = useState<{ id: number; rows: PlanRow[] } | null>(null);

  const [name, setName] = useState("");
  const [profession, setProfession] = useState("gp");
  const [layer, setLayer] = useState("hard");
  const [objective, setObjective] = useState("");
  const [theme, setTheme] = useState("");
  const [brief, setBrief] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/api/campaigns");
      const j = await res.json();
      setConnected(j.connected !== false);
      setList(j.campaigns || []);
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) { setMsg("Give the campaign a name."); return; }
    setMsg("");
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, profession, layer, objective, theme, brief, startsOn: startsOn || null, endsOn: endsOn || null }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    setName(""); setObjective(""); setTheme(""); setBrief("");
    load();
  }

  async function buildPlan(c: Campaign) {
    if (plan?.id === c.id) { setPlan(null); return; }
    const res = await fetch("/api/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layer: c.layer }),
    });
    const j = await res.json();
    setPlan({ id: c.id, rows: j.plan || [] });
  }

  if (!connected) {
    return (
      <div className="column">
        <div className="empty">
          <strong>Campaigns need a database</strong>
          <p>Add Neon in Vercel under Storage, then create the tables from the Library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="column">
      {msg && <div className="alert">{msg}</div>}

      <div className="prose" style={{ marginBottom: 16 }}>
        <p>
          A campaign holds the brief once, so the whole asset set inherits it.
          The funnel layer is deliberate: the soft layer educates and carries no
          hard CTA, the hard layer drives the action. Keeping them apart is the
          point — collapsing them is how educational content turns into ads.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>New campaign</h2></div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="field">
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="February income protection — GPs" />
            </div>
            <div className="field">
              <label>Monthly theme <span className="sub">— optional</span></label>
              <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Income Protection awareness" />
            </div>
          </div>
          <div className="field">
            <label>Audience</label>
            <div className="chips">
              {PROFESSIONS.map((p) => (
                <button key={p.id} className={profession === p.id ? "chip on" : "chip"} onClick={() => setProfession(p.id)}>{p.name}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Funnel layer</label>
            <div className="chips">
              <button className={layer === "soft" ? "chip on" : "chip"} onClick={() => setLayer("soft")}>
                Soft<small>Educational, no hard CTA</small>
              </button>
              <button className={layer === "hard" ? "chip on" : "chip"} onClick={() => setLayer("hard")}>
                Hard<small>Drives the action</small>
              </button>
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Starts</label><input type="text" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} placeholder="2026-10-01" /></div>
            <div className="field"><label>Ends</label><input type="text" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} placeholder="2026-10-31" /></div>
          </div>
          <div className="field">
            <label>Objective</label>
            <input type="text" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Consultation bookings from GMS-contracted GPs" />
          </div>
          <div className="field">
            <label>Shared brief <span className="sub">— inherited by every piece</span></label>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Angle, must-mentions, what to avoid across the whole campaign" />
          </div>
          <button className="btn btn-primary" onClick={create}>Create campaign</button>
        </div>
      </section>

      {busy && <div className="busy"><span className="spinner" /> Loading campaigns</div>}

      {!busy && !list.length && (
        <div className="empty">
          <strong>No campaigns yet</strong>
          <p>Create one above, then pick it when you draft so every piece carries the same brief.</p>
        </div>
      )}

      {list.map((c) => (
        <section className="panel" key={c.id}>
          <div className="panel-head">
            <h2>{c.name}</h2>
            <span className="hint">
              {c.profession} · {c.layer} layer
              {c.starts_on ? ` · from ${String(c.starts_on).slice(0, 10)}` : ""}
            </span>
          </div>
          <div className="panel-body">
            {c.objective && <p style={{ margin: "0 0 10px", fontSize: 13 }}>{c.objective}</p>}
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <span className="pill verified">{c.approved_count} approved</span>
              <span className="pill disputed">{c.piece_count - c.approved_count} in progress</span>
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => onUse(c)}>Write for this campaign</button>
              <button className="btn-quiet" onClick={() => buildPlan(c)}>
                {plan?.id === c.id ? "Hide suggested set" : "Suggested asset set"}
              </button>
            </div>
            {plan?.id === c.id && (
              <div className="ledger-group" style={{ marginTop: 14 }}>
                <h3>Suggested set for a {c.layer} campaign</h3>
                {plan.rows.map((r) => (
                  <div className="rule-row" key={r.channel}>
                    <span className="tick pass">·</span>
                    <div><b>{r.channelName}</b><em>{r.role}</em></div>
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
