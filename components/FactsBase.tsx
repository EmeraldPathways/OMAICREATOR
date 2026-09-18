"use client";

import { useEffect, useState } from "react";

interface Fact {
  id: number;
  fact_key: string;
  label: string;
  status: "verified" | "disputed" | "retired";
  note: string | null;
  updated_at: string;
  value: string;
}

const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date recorded" : date.toISOString().slice(0, 10);
};

export default function FactsBase() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [connected, setConnected] = useState(true);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ label: "", value: "", status: "verified", note: "" });

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/fact-base");
      const data = await response.json();
      setConnected(data.connected !== false);
      setFacts(data.facts || []);
      if (data.error) setMessage(data.error);
    } catch {
      setConnected(false);
      setMessage("The fact base could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(fact: Fact) {
    setEditing(fact.id);
    setForm({ label: fact.label, value: fact.value, status: fact.status, note: fact.note || "" });
    setMessage("");
  }

  function clearForm() {
    setEditing(null);
    setForm({ label: "", value: "", status: "verified", note: "" });
  }

  async function save() {
    if (!form.label.trim() || !form.value.trim()) {
      setMessage("Complete the fact label and value before saving.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(editing ? "/api/fact-base" : "/api/fact-base", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing, label: form.label, value: form.value, status: form.status, note: form.note } : { factKey: form.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), label: form.label, value: form.value, status: form.status, note: form.note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the fact.");
      setMessage(editing ? "Fact updated in the database." : "Fact added to the database.");
      clearForm();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the fact.");
      setBusy(false);
    }
  }

  async function retire(id: number) {
    if (!window.confirm("Retire this fact? It will no longer be used in new drafts.")) return;
    const response = await fetch("/api/fact-base", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) { setMessage("Could not retire the fact."); return; }
    setMessage("Fact retired.");
    await load();
  }

  const live = facts.filter((fact) => fact.status !== "retired");
  const expired = facts.filter((fact) => fact.status === "retired");

  return <div className="column">
    {message && <div className="alert" role="status">{message}</div>}
    <div className="prose" style={{ marginBottom: 18 }}>
      <p>Manage the original Omega-specific facts the writer is allowed to use. Keep disputed or retired claims visible for governance, but prevent them from being used as approved copy.</p>
    </div>

    {!connected ? <section className="panel"><div className="panel-head"><h2>Database unavailable</h2></div><div className="panel-body"><p>The Fact Base needs the hosted database connection before facts can be added or edited.</p></div></section> : <>
      <section className="panel">
        <div className="panel-head"><h2>{editing ? "Edit fact" : "Add fact"}</h2><span className="hint">Saved directly to the database</span></div>
        <div className="panel-body">
          <div className="grid-2"><div className="field"><label>Fact label</label><input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Regulatory line" /></div><div className="field"><label>Status</label><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="verified">Verified</option><option value="disputed">Disputed</option><option value="retired">Retired</option></select></div></div>
          <div className="field"><label>Value</label><textarea value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="The approved wording or fact value" /></div>
          <div className="field"><label>Governance note <span className="sub">— optional</span></label><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Why this fact is disputed, retired or subject to a condition" /></div>
          <div className="btn-row"><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving" : editing ? "Save changes" : "Add fact"}</button>{editing && <button className="btn-quiet" onClick={clearForm}>Cancel</button>}</div>
        </div>
      </section>

      {busy && !facts.length ? <div className="busy"><span className="spinner" /> Loading fact base</div> : <>
        <section className="panel"><div className="panel-head"><h2>Original Omega facts</h2><span className="hint">{live.length} available to the writer</span></div><div className="panel-body">{live.length ? <div className="fact-list">{live.map((fact) => <article className="fact-card" key={fact.id}><div><strong>{fact.label}</strong><p>{fact.value}</p>{fact.note && <small>{fact.note}</small>}<small> · Status: {fact.status} · Last updated {displayDate(fact.updated_at)}</small></div><div className="btn-row"><button className="btn-quiet" onClick={() => startEdit(fact)}>Edit</button><button className="btn-quiet" onClick={() => retire(fact.id)}>Retire</button></div></article>)}</div> : <div className="empty"><strong>No current facts</strong><p>Add the first fact above.</p></div>}</div></section>
        {expired.length > 0 && <section className="needs"><h3>Retired facts</h3><p>These remain visible for review but are not available to new drafts.</p>{expired.map((fact) => <div className="rule-row" key={fact.id}><span className="tick fail">✕</span><div><b>{fact.label}</b><em>{fact.value}</em></div><button className="btn-quiet" onClick={() => startEdit(fact)}>Review</button></div>)}</section>}
      </>}
    </>}
  </div>;
}
