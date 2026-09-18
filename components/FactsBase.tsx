"use client";

import { useEffect, useState } from "react";

interface Fact {
  id: number;
  claim: string;
  value: string;
  source_url: string;
  source_title: string | null;
  verified_by: string;
  verified_at: string;
  expires_at: string;
  expired: boolean;
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
  const [form, setForm] = useState({ claim: "", value: "", sourceUrl: "", verifiedBy: "", monthsValid: "6" });

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/library");
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
    setForm({ claim: fact.claim, value: fact.value, sourceUrl: fact.source_url, verifiedBy: fact.verified_by, monthsValid: "6" });
    setMessage("");
  }

  function clearForm() {
    setEditing(null);
    setForm({ claim: "", value: "", sourceUrl: "", verifiedBy: "", monthsValid: "6" });
  }

  async function save() {
    if (!form.claim.trim() || !form.value.trim() || !form.sourceUrl.trim() || !form.verifiedBy.trim()) {
      setMessage("Complete the fact, value, source URL and reviewer before saving.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/facts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing, ...form, monthsValid: Number(form.monthsValid) }),
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
    const response = await fetch("/api/facts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) { setMessage("Could not retire the fact."); return; }
    setMessage("Fact retired.");
    await load();
  }

  const live = facts.filter((fact) => !fact.expired);
  const expired = facts.filter((fact) => fact.expired);

  return <div className="column">
    {message && <div className="alert" role="status">{message}</div>}
    <div className="prose" style={{ marginBottom: 18 }}>
      <p>Manage the verified figures the writer is allowed to use. Every fact needs a source, reviewer and expiry date so outdated information is not carried into client-facing content.</p>
    </div>

    {!connected ? <section className="panel"><div className="panel-head"><h2>Database unavailable</h2></div><div className="panel-body"><p>The Fact Base needs the hosted database connection before facts can be added or edited.</p></div></section> : <>
      <section className="panel">
        <div className="panel-head"><h2>{editing ? "Edit verified fact" : "Add verified fact"}</h2><span className="hint">Saved directly to the database</span></div>
        <div className="panel-body">
          <div className="grid-2"><div className="field"><label>Fact or claim</label><input value={form.claim} onChange={(event) => setForm({ ...form, claim: event.target.value })} placeholder="State Illness Benefit, personal rate" /></div><div className="field"><label>Value</label><input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="Current amount or wording" /></div></div>
          <div className="field"><label>Source URL</label><input value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://www.gov.ie/..." /></div>
          <div className="grid-2"><div className="field"><label>Verified by</label><input value={form.verifiedBy} onChange={(event) => setForm({ ...form, verifiedBy: event.target.value })} placeholder="Your name" /></div><div className="field"><label>Review after</label><select value={form.monthsValid} onChange={(event) => setForm({ ...form, monthsValid: event.target.value })}><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></div></div>
          <div className="btn-row"><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving" : editing ? "Save changes" : "Add fact"}</button>{editing && <button className="btn-quiet" onClick={clearForm}>Cancel</button>}</div>
        </div>
      </section>

      {busy && !facts.length ? <div className="busy"><span className="spinner" /> Loading fact base</div> : <>
        <section className="panel"><div className="panel-head"><h2>Current facts</h2><span className="hint">{live.length} available to the writer</span></div><div className="panel-body">{live.length ? <div className="fact-list">{live.map((fact) => <article className="fact-card" key={fact.id}><div><strong>{fact.claim}</strong><p>{fact.value}</p><small>Verified by {fact.verified_by} · review by {displayDate(fact.expires_at)} · <a href={fact.source_url} target="_blank" rel="noreferrer">source</a></small></div><div className="btn-row"><button className="btn-quiet" onClick={() => startEdit(fact)}>Edit</button><button className="btn-quiet" onClick={() => retire(fact.id)}>Retire</button></div></article>)}</div> : <div className="empty"><strong>No current facts</strong><p>Add the first verified figure above.</p></div>}</div></section>
        {expired.length > 0 && <section className="needs"><h3>Expired facts</h3><p>These remain visible for review but are not available to new drafts.</p>{expired.map((fact) => <div className="rule-row" key={fact.id}><span className="tick fail">✕</span><div><b>{fact.claim}</b><em>{fact.value} · expired {displayDate(fact.expires_at)}</em></div><button className="btn-quiet" onClick={() => startEdit(fact)}>Review</button></div>)}</section>}
      </>}
    </>}
  </div>;
}
