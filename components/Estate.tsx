"use client";

import { useEffect, useState } from "react";

interface Finding {
  id?: number;
  url: string;
  page_title?: string;
  pageTitle?: string;
  fact_id?: string;
  factId?: string;
  kind: string;
  excerpt: string;
  note?: string;
}

const norm = (f: Finding) => ({
  ...f,
  title: f.page_title || f.pageTitle || "",
  fact: f.fact_id || f.factId || "",
});

export default function Estate() {
  const [urls, setUrls] = useState("https://omegafinancial.ie");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/estate");
    const j = await res.json();
    if (j.findings?.length) setFindings(j.findings);
  }
  useEffect(() => { load(); }, []);

  async function scan() {
    setBusy(true); setMsg(""); setErrors([]);
    try {
      const res = await fetch("/api/estate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error); return; }
      setFindings(j.found || []);
      setErrors(j.errors || []);
      if (!j.found?.length && !j.errors?.length) {
        setMsg(`Scanned ${j.scanned} ${j.scanned === 1 ? "page" : "pages"}. Nothing flagged.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "The scan failed.");
    } finally { setBusy(false); }
  }

  async function resolve(id?: number) {
    if (!id) return;
    await fetch("/api/estate", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setFindings((f) => f.filter((x) => x.id !== id));
  }

  return (
    <div className="column">
      {msg && <div className="alert">{msg}</div>}

      <div className="prose" style={{ marginBottom: 16 }}>
        <p>
          Points the retired-fact checker at content that is already live. It
          looks for withdrawn products, partnerships that do not exist, the
          client-count and years-trading conflicts, and language the Code does
          not allow.
        </p>
        <p>
          It reads the rendered HTML, so pages built entirely in JavaScript may
          come back clean when they are not. PDFs are skipped.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Scan live pages</h2>
          <span className="hint">One URL per line, up to 25</span>
        </div>
        <div className="panel-body">
          <div className="field">
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={5}
              placeholder={"https://omegafinancial.ie\nhttps://omegafinancial.ie/gps"} />
          </div>
          <button className="btn btn-primary" onClick={scan} disabled={busy}>
            {busy ? "Scanning" : "Run the sweep"}
          </button>
          {busy && <span className="busy" style={{ marginLeft: 12 }}><span className="spinner" /> Fetching pages</span>}
        </div>
      </section>

      {errors.length > 0 && (
        <div className="needs">
          <h3>Could not scan</h3>
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {findings.map(norm).map((f, i) => (
        <section className="panel" key={f.id ?? i}>
          <div className="panel-head">
            <h2>{f.title || f.url}</h2>
            <span className="hint">
              <span className={`pill ${f.kind === "retired" ? "retired" : f.kind === "disputed" ? "disputed" : "retired"}`}>{f.kind}</span>
            </span>
          </div>
          <div className="panel-body">
            <p style={{ margin: "0 0 9px", fontSize: 13, fontStyle: "italic", color: "var(--ink-soft)" }}>{f.excerpt}</p>
            {f.note && <p style={{ margin: "0 0 11px", fontSize: 12.5 }}><b>Why:</b> {f.note}</p>}
            <div className="btn-row">
              <a className="btn btn-secondary" href={f.url} target="_blank" rel="noreferrer">Open page</a>
              {f.id && <button className="btn-quiet" onClick={() => resolve(f.id)}>Mark fixed</button>}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
