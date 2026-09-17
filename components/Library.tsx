"use client";

import { Fragment, useEffect, useState } from "react";
import { CHANNELS } from "@/lib/brand";
import { CONTENT_PACKS, type ContentPack } from "@/lib/contentPacks";

interface Piece {
  id: number;
  channel: string;
  format: string;
  profession: string;
  topic: string;
  was_edited: boolean;
  verdict: string | null;
  approved_by: string;
  approved_at: string;
  excerpt: string;
}

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

interface Lesson {
  id: number;
  scope: string;
  category: string;
  lesson: string;
  evidence: string | null;
  times_seen: number;
}

interface Finding {
  rule: string;
  kind: string;
  hits: number;
}

interface LibraryData {
  connected: boolean;
  vector?: boolean;
  pieces?: Piece[];
  facts?: Fact[];
  lessons?: Lesson[];
  findings?: Finding[];
  error?: string;
}

const day = (s: string) => new Date(s).toISOString().slice(0, 10);

interface LibraryProps {
  onUsePack?: (pack: ContentPack) => void;
}

function ContentPacks({ onUsePack }: LibraryProps) {
  const [query, setQuery] = useState("");
  const filtered = CONTENT_PACKS.filter((pack) =>
    `${pack.name} ${pack.category} ${pack.source} ${pack.summary} ${pack.prompts.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Professional content packs</h2>
          <span className="hint">Your supplied Omega source material, ready to guide new drafts</span>
        </div>
        <span className="pill verified">{CONTENT_PACKS.length} packs</span>
      </div>
      <div className="panel-body">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search professions, pensions or prompts"
          aria-label="Search professional content packs"
          style={{ marginBottom: 14 }}
        />
        <div className="pack-grid">
          {filtered.map((pack) => (
            <article className="pack-card" key={pack.id}>
              <div className="pack-card-head">
                <span className="basis">{pack.category}</span>
                <strong>{pack.name}</strong>
              </div>
              <p>{pack.summary}</p>
              <small>Source: {pack.source}</small>
              <div className="chips compact-chips">
                {pack.prompts.map((prompt) => <span className="chip" key={prompt}>{prompt}</span>)}
              </div>
              {onUsePack && (
                <button className="btn btn-secondary" onClick={() => onUsePack(pack)}>
                  Use in a new draft
                </button>
              )}
            </article>
          ))}
        </div>
        {!filtered.length && <div className="empty"><strong>No matching packs</strong><p>Try a profession, pension term or prompt.</p></div>}
      </div>
    </section>
  );
}

export default function Library({ onUsePack }: LibraryProps) {
  const [data, setData] = useState<LibraryData | null>(null);
  const [busy, setBusy] = useState(true);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"packs" | "facts" | "lessons" | "pieces">("packs");
  const [repurposing, setRepurposing] = useState<number | null>(null);
  const [repurposed, setRepurposed] = useState<{ id: number; content: string; needs: string[]; dropped: string[] } | null>(null);
  const [target, setTarget] = useState("linkedin:short");
  const [editing, setEditing] = useState<number | null>(null);
  const [editClaim, setEditClaim] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [editMonths, setEditMonths] = useState("6");

  const [claim, setClaim] = useState("");
  const [value, setValue] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [months, setMonths] = useState("6");

  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/api/library");
      setData(await res.json());
    } catch {
      setData({ connected: false });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setupSchema() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/db/init", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(
        `Tables created.${j.vector ? " Similarity search is on." : ""}${
          j.notes?.length ? " " + j.notes.join(" ") : ""
        }`
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Setup failed.");
      setBusy(false);
    }
  }

  async function addFact() {
    if (!claim.trim() || !value.trim() || !sourceUrl.trim() || !verifiedBy.trim()) {
      setMsg("A figure needs the claim, the value, a source URL, and who checked it.");
      return;
    }
    setMsg("");
    const res = await fetch("/api/facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim,
        value,
        sourceUrl,
        verifiedBy,
        monthsValid: Number(months),
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setMsg(j.error);
      return;
    }
    setClaim("");
    setValue("");
    setSourceUrl("");
    setMsg("Saved. It will be offered to the writer until it expires.");
    load();
  }

  async function retireFact(id: number) {
    await fetch("/api/facts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function startEditing(fact: Fact) {
    setEditing(fact.id);
    setEditClaim(fact.claim);
    setEditValue(fact.value);
    setEditSourceUrl(fact.source_url);
    setEditVerifiedBy(fact.verified_by);
    setEditMonths("6");
    setMsg("");
  }

  async function saveEdit() {
    if (!editing || !editClaim.trim() || !editValue.trim() || !editSourceUrl.trim() || !editVerifiedBy.trim()) {
      setMsg("Complete every field before saving the edited figure.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/facts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing,
          claim: editClaim,
          value: editValue,
          sourceUrl: editSourceUrl,
          verifiedBy: editVerifiedBy,
          monthsValid: Number(editMonths),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setEditing(null);
      setMsg("Updated in the database. The writer will use the revised figure.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not update the figure.");
      setBusy(false);
    }
  }

  async function repurpose(id: number) {
    const [channel, format] = target.split(":");
    setRepurposing(id);
    setMsg("");
    setRepurposed(null);
    try {
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id, target: { channel, format } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setRepurposed({
        id,
        content: j.draft?.content || "",
        needs: j.draft?.needs || [],
        dropped: j.draft?.dropped || [],
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Repurposing failed.");
    } finally {
      setRepurposing(null);
    }
  }

  async function retirePiece(id: number) {
    await fetch("/api/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (busy && !data) {
    return (
      <div className="column">
        <div className="busy">
          <span className="spinner" /> Reading the library
        </div>
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <div className="column">
        <section className="panel">
          <div className="panel-head">
            <h2>No database connected</h2>
          </div>
          <div className="panel-body prose">
            <p>
              The tool works without one — it just cannot remember anything
              between sessions. The hosted D1 database is available for this
              site; use the button below to create its tables if they are missing.
            </p>
            <p>Once the tables exist, professional knowledge, campaigns and approved drafts will persist.</p>
          </div>
        </section>
      </div>
    );
  }

  const expired = (data.facts || []).filter((f) => f.expired);
  const live = (data.facts || []).filter((f) => !f.expired);
  const noTables = Boolean(data.error);

  return (
    <div className="column">
      {msg && <div className="alert">{msg}</div>}

      {noTables && (
        <section className="panel">
          <div className="panel-head">
            <h2>Tables not created yet</h2>
          </div>
          <div className="panel-body">
            <p style={{ marginTop: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
              The database is connected but empty. This creates the tables and is
              safe to run more than once.
            </p>
            <button className="btn btn-primary" onClick={setupSchema} disabled={busy}>
              Create the tables
            </button>
          </div>
        </section>
      )}

      {noTables && <ContentPacks onUsePack={onUsePack} />}

      {!noTables && (
        <>
          <div className="chips" style={{ marginBottom: 16 }}>
            <button
              className={tab === "packs" ? "chip on" : "chip"}
              onClick={() => setTab("packs")}
            >
              Content packs
              <small>{CONTENT_PACKS.length} ready</small>
            </button>
            <button
              className={tab === "facts" ? "chip on" : "chip"}
              onClick={() => setTab("facts")}
            >
              Verified figures
              <small>{live.length} live, {expired.length} expired</small>
            </button>
            <button
              className={tab === "lessons" ? "chip on" : "chip"}
              onClick={() => setTab("lessons")}
            >
              Learned corrections
              <small>{data.lessons?.length || 0} active</small>
            </button>
            <button
              className={tab === "pieces" ? "chip on" : "chip"}
              onClick={() => setTab("pieces")}
            >
              Approved work
              <small>{data.pieces?.length || 0} pieces</small>
            </button>
          </div>

          {tab === "packs" && <ContentPacks onUsePack={onUsePack} />}

          {/* ------------------------------------------------- figures -- */}
          {tab === "facts" && (
            <>
              {expired.length > 0 && (
                <div className="needs">
                  <h3>Expired — re-check before these can be used again</h3>
                  <p style={{ margin: "0 0 9px", fontSize: 12.5 }}>
                    The writer is blocked from using anything on this list. That
                    is the point: a cached figure with no expiry is how a tool
                    starts confidently publishing last year&apos;s rates.
                  </p>
                  {expired.map((f) => (
                    <div className="rule-row" key={f.id}>
                      <span className="tick fail">✕</span>
                      <div style={{ flex: 1 }}>
                        <b>{f.claim}</b>
                        <em>
                          {f.value} · expired {day(f.expires_at)} ·{" "}
                          <a href={f.source_url} target="_blank" rel="noreferrer">
                            source
                          </a>
                        </em>
                      </div>
                                <button className="btn-quiet" onClick={() => retireFact(f.id)}>
                                  Retire
                                </button>
                    </div>
                  ))}
                </div>
              )}

              <section className="panel">
                <div className="panel-head">
                  <h2>Add a verified figure</h2>
                  <span className="hint">Checked by a person, against a source</span>
                </div>
                <div className="panel-body">
                  <div className="grid-2">
                    <div className="field">
                      <label>What the figure is</label>
                      <input
                        type="text"
                        value={claim}
                        onChange={(e) => setClaim(e.target.value)}
                        placeholder="State Illness Benefit, personal rate"
                      />
                    </div>
                    <div className="field">
                      <label>The value</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="€X per week"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Source URL</label>
                    <input
                      type="text"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://www.gov.ie/..."
                    />
                  </div>
                  <div className="grid-2">
                    <div className="field">
                      <label>Checked by</label>
                      <input
                        type="text"
                        value={verifiedBy}
                        onChange={(e) => setVerifiedBy(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="field">
                      <label>
                        Valid for <span className="sub">— then it expires</span>
                      </label>
                      <select value={months} onChange={(e) => setMonths(e.target.value)}>
                        <option value="3">3 months — changes often</option>
                        <option value="6">6 months</option>
                        <option value="12">12 months — annual rates</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={addFact}>
                    Save the figure
                  </button>
                </div>
              </section>

              {live.length > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>In use</h2>
                  </div>
                  <div className="panel-body">
                    <table className="facts-table">
                      <thead>
                        <tr>
                          <th>Figure</th>
                          <th>Value</th>
                          <th>Expires</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {live.map((f) => (
                          <Fragment key={f.id}>
                            <tr key={f.id}>
                              <td>
                                {f.claim}
                                <em>
                                  Checked by {f.verified_by} on {day(f.verified_at)} ·{" "}
                                  <a href={f.source_url} target="_blank" rel="noreferrer">
                                    source
                                  </a>
                                </em>
                              </td>
                              <td>{f.value}</td>
                              <td><span className="pill verified">{day(f.expires_at)}</span></td>
                              <td>
                                <div className="btn-row">
                                  <button className="btn-quiet" onClick={() => startEditing(f)}>Edit</button>
                                  <button className="btn-quiet" onClick={() => retireFact(f.id)}>Retire</button>
                                </div>
                              </td>
                            </tr>
                            {editing === f.id && (
                            <tr key={`${f.id}-edit`} className="fact-edit-row">
                              <td colSpan={4}>
                                <div className="fact-edit">
                                  <div className="grid-2">
                                    <div className="field"><label>What the figure is</label><input value={editClaim} onChange={(e) => setEditClaim(e.target.value)} /></div>
                                    <div className="field"><label>The value</label><input value={editValue} onChange={(e) => setEditValue(e.target.value)} /></div>
                                  </div>
                                  <div className="field"><label>Source URL</label><input value={editSourceUrl} onChange={(e) => setEditSourceUrl(e.target.value)} /></div>
                                  <div className="grid-2">
                                    <div className="field"><label>Checked by</label><input value={editVerifiedBy} onChange={(e) => setEditVerifiedBy(e.target.value)} /></div>
                                    <div className="field"><label>Valid for</label><select value={editMonths} onChange={(e) => setEditMonths(e.target.value)}><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></div>
                                  </div>
                                  <div className="btn-row"><button className="btn btn-primary" onClick={saveEdit} disabled={busy}>Save changes</button><button className="btn-quiet" onClick={() => setEditing(null)}>Cancel</button></div>
                                </div>
                              </td>
                            </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

          {/* ------------------------------------------------- lessons -- */}
          {tab === "lessons" && (
            <>
              <div className="prose" style={{ marginBottom: 16 }}>
                <p>
                  These are written automatically by comparing each AI draft to
                  the version you actually approved. Anything that would weaken
                  factual care or compliance is filtered out before it lands here
                  — the tool never learns to be looser.
                </p>
              </div>

              {!data.lessons?.length && (
                <div className="empty">
                  <strong>Nothing learned yet</strong>
                  <p>
                    Approve a piece you have edited and the difference becomes a
                    correction here. Approving an unedited draft teaches nothing,
                    which is correct — it means the draft was already right.
                  </p>
                </div>
              )}

              {data.lessons?.map((l) => (
                <div className="claim verified" key={l.id}>
                  <q>{l.lesson}</q>
                  <div className="claim-foot">
                    <span className="basis">{l.category}</span>
                    <span>
                      {l.scope === "all" ? "everywhere" : l.scope}
                      {l.times_seen > 1 ? ` · seen ${l.times_seen} times` : ""}
                      {l.evidence ? ` · ${l.evidence}` : ""}
                    </span>
                  </div>
                </div>
              ))}

              {data.findings?.length ? (
                <div className="ledger-group" style={{ marginTop: 22 }}>
                  <h3>Recurring audit failures</h3>
                  {data.findings.map((f, i) => (
                    <div className="rule-row" key={i}>
                      <span className="tick fail">{f.hits}</span>
                      <div>
                        <b>{f.rule}</b>
                        <em>{f.kind}</em>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {/* -------------------------------------------------- pieces -- */}
          {tab === "pieces" && (
            <>
              {!data.pieces?.length && (
                <div className="empty">
                  <strong>No approved work yet</strong>
                  <p>
                    Sign off a draft and it becomes a reference the writer matches
                    against next time — register and structure, never its facts.
                  </p>
                </div>
              )}
              {data.pieces?.map((p) => (
                <section className="panel" key={p.id}>
                  <div className="panel-head">
                    <h2>{p.topic}</h2>
                    <span className="hint">
                      {p.channel} · {p.profession} · {day(p.approved_at)} ·{" "}
                      {p.approved_by}
                    </span>
                  </div>
                  <div className="panel-body">
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-soft)" }}>
                      {p.excerpt}…
                    </p>
                    <div className="btn-row" style={{ marginBottom: 12 }}>
                      <span className={`pill ${p.was_edited ? "disputed" : "verified"}`}>
                        {p.was_edited ? "edited before approval" : "approved as written"}
                      </span>
                      <button className="btn-quiet" onClick={() => retirePiece(p.id)}>
                        Stop using as a reference
                      </button>
                    </div>

                    <div className="btn-row">
                      <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ maxWidth: 260 }}>
                        {CHANNELS.flatMap((c) =>
                          c.formats.map((f) => (
                            <option key={`${c.id}:${f.id}`} value={`${c.id}:${f.id}`}>
                              {c.name} — {f.name}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        className="btn btn-secondary"
                        onClick={() => repurpose(p.id)}
                        disabled={repurposing === p.id}
                      >
                        {repurposing === p.id ? "Adapting" : "Repurpose"}
                      </button>
                    </div>

                    {repurposed?.id === p.id && (
                      <>
                        <div className="draft" style={{ marginTop: 14, border: "1px solid var(--rule)" }}>
                          {repurposed.content}
                        </div>
                        {repurposed.dropped.length > 0 && (
                          <div className="variants">
                            <h3>Cut from the source — check nothing essential was lost</h3>
                            <ul>{repurposed.dropped.map((d, i) => <li key={i}>{d}</li>)}</ul>
                          </div>
                        )}
                        {repurposed.needs.length > 0 && (
                          <div className="needs" style={{ marginTop: 12 }}>
                            <h3>The target format wanted these, and the source did not have them</h3>
                            <ul>{repurposed.needs.map((n, i) => <li key={i}>{n}</li>)}</ul>
                          </div>
                        )}
                        <div className="btn-row" style={{ marginTop: 12 }}>
                          <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(repurposed.content)}>
                            Copy
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
