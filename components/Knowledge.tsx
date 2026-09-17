"use client";

import { useEffect, useState } from "react";
import { PROFESSIONS } from "@/lib/brand";

interface Entry {
  id: number;
  profession: string;
  topic: string;
  body: string;
  source_url: string | null;
  added_by: string;
  added_at: string;
  expires_at: string | null;
}

const SEEDS: Record<string, string[]> = {
  gp: ["How the GMS contract handles absence", "Locum cover rates and who pays", "Practice partnership vs salaried structures"],
  dentist: ["Practice ownership models and their income profiles", "Physical dependency and career length", "Associate vs principal earnings structure"],
  consultant: ["Public and private contract types", "How HSE and private income interact", "Private practice setup and its overheads"],
  pharmacist: ["Pharmacy ownership and succession", "Staff pension obligations for owners", "Contractor income structure"],
};

const safeDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date recorded in database" : date.toISOString().slice(0, 10);
};

export default function Knowledge() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [connected, setConnected] = useState(true);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("gp");

  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [months, setMonths] = useState("12");

  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/api/knowledge");
      const j = await res.json();
      setConnected(j.connected !== false);
      setEntries(j.entries || []);
      if (j.error) setMsg(j.error);
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!topic.trim() || !body.trim() || !addedBy.trim()) {
      setMsg("An entry needs a topic, the detail itself, and your name.");
      return;
    }
    setMsg("");
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profession: filter, topic, body, sourceUrl, addedBy, monthsValid: Number(months) }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    setTopic(""); setBody(""); setSourceUrl("");
    load();
  }

  async function remove(id: number) {
    await fetch("/api/knowledge", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (!connected) {
    return (
      <div className="column">
        <div className="empty">
          <strong>The knowledge base needs a database</strong>
          <p>Add Neon in Vercel under Storage, then create the tables from the Library.</p>
        </div>
      </div>
    );
  }

  const shown = entries.filter((e) => e.profession === filter);

  return (
    <div className="column">
      {msg && <div className="alert">{msg}</div>}

      <div className="prose" style={{ marginBottom: 16 }}>
        <p>
          The fact base covers Omega. This covers the client&apos;s working life —
          how a GMS contract handles absence, what a dental practice sale looks
          like, how consultant contracts split public and private income. It is
          what makes the copy specific rather than generic, which is the whole
          argument against a generalist advisor.
        </p>
        <p>
          Keep it qualitative. Anything numeric belongs in verified figures,
          where it gets an expiry and a source.
        </p>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {PROFESSIONS.map((p) => (
          <button key={p.id} className={filter === p.id ? "chip on" : "chip"} onClick={() => setFilter(p.id)}>
            {p.name}
            <small>{entries.filter((e) => e.profession === p.id).length} entries</small>
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Add what you know</h2></div>
        <div className="panel-body">
          <div className="field">
            <label>Topic</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={SEEDS[filter]?.[0] || "Topic"} />
            {SEEDS[filter] && (
              <div className="chips" style={{ marginTop: 8 }}>
                {SEEDS[filter].map((s) => (
                  <button key={s} className="chip" onClick={() => setTopic(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <label>The detail</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Written the way an advisor would explain it to a colleague." />
          </div>
          <div className="grid-2">
            <div className="field"><label>Source <span className="sub">— optional</span></label>
              <input type="text" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="field"><label>Added by</label>
              <input type="text" value={addedBy} onChange={(e) => setAddedBy(e.target.value)} placeholder="Your name" /></div>
          </div>
          <div className="field">
            <label>Review after</label>
            <select value={months} onChange={(e) => setMonths(e.target.value)}>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months — structural, rarely changes</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={add}>Save entry</button>
        </div>
      </section>

      {busy && <div className="busy"><span className="spinner" /> Loading</div>}

      {!busy && !shown.length && (
        <div className="empty">
          <strong>Nothing for this profession yet</strong>
          <p>Start with the three suggestions above. Even short entries change how specific the copy reads.</p>
        </div>
      )}

      {shown.map((e) => (
        <div className="claim verified" key={e.id}>
          <q><b>{e.topic}</b> — {e.body}</q>
          <div className="claim-foot">
            <span className="basis">K{e.id}</span>
            <span>
              {e.added_by} · {safeDate(e.added_at)}
              {e.expires_at ? ` · review by ${String(e.expires_at).slice(0, 10)}` : ""}
              {e.source_url ? " · " : ""}
              {e.source_url && <a href={e.source_url} target="_blank" rel="noreferrer">source</a>}
            </span>
            <button className="btn-quiet" onClick={() => remove(e.id)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}
