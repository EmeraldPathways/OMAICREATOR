"use client";

import { useEffect, useState } from "react";
import { CHANNELS, PROFESSIONS } from "@/lib/brand";
import { CAREER_STAGES } from "@/lib/craft";

interface Ex { id: number | string; channel: string; label: string; note: string | null; body: string; seeded?: boolean; added_by?: string }
interface Qu { id: number; profession: string; stage: string | null; kind: string; text: string; context: string | null; heard_from: string | null; times_heard: number }

export default function VoiceBank() {
  const [tab, setTab] = useState<"exemplars" | "questions">("exemplars");
  const [exemplars, setExemplars] = useState<Ex[]>([]);
  const [questions, setQuestions] = useState<Qu[]>([]);
  const [connected, setConnected] = useState(true);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const [eChannel, setEChannel] = useState("email");
  const [eLabel, setELabel] = useState("");
  const [eNote, setENote] = useState("");
  const [eBody, setEBody] = useState("");
  const [eBy, setEBy] = useState("");

  const [qProf, setQProf] = useState("gp");
  const [qStage, setQStage] = useState("");
  const [qKind, setQKind] = useState("question");
  const [qText, setQText] = useState("");
  const [qContext, setQContext] = useState("");
  const [qFrom, setQFrom] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/voicebank");
      const j = await res.json();
      setConnected(j.connected !== false);
      setExemplars(j.exemplars || []);
      setQuestions(j.questions || []);
    } catch { /* seeded exemplars still render */ }
  }
  useEffect(() => { load(); }, []);

  async function addExemplar() {
    if (!eLabel.trim() || !eBody.trim() || !eBy.trim()) {
      setMsg("An exemplar needs a label, the copy itself, and your name."); return;
    }
    const res = await fetch("/api/voicebank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "exemplar", channel: eChannel, label: eLabel, note: eNote, body: eBody, addedBy: eBy }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    setELabel(""); setENote(""); setEBody(""); setMsg(""); load();
  }

  async function addQuestion() {
    if (!qText.trim()) { setMsg("What is the question?"); return; }
    const res = await fetch("/api/voicebank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profession: qProf, stage: qStage, qkind: qKind, text: qText, context: qContext, heardFrom: qFrom }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    setQText(""); setQContext("");
    setMsg(j.merged ? "Already in the bank — its count went up, which is the useful signal." : "");
    load();
  }

  async function remove(id: number | string, kind: string) {
    await fetch("/api/voicebank", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind }),
    });
    load();
  }

  return (
    <div className="column">
      {msg && <div className="alert">{msg}</div>}

      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={tab === "exemplars" ? "chip on" : "chip"} onClick={() => setTab("exemplars")}>
          Style exemplars<small>{exemplars.length} pieces</small>
        </button>
        <button className={tab === "questions" ? "chip on" : "chip"} onClick={() => setTab("questions")}>
          Question bank<small>{questions.length} recorded</small>
        </button>
      </div>

      {tab === "exemplars" && (
        <>
          <div className="prose" style={{ marginBottom: 16 }}>
            <p>
              A description of the voice tells the writer what to aim at. Real
              approved copy shows it. Four pieces are seeded from the Brand Guide
              and the July&ndash;September client programme; the more real
              approved work you add, the less the output drifts.
            </p>
            <p>Two per channel are sent with each draft, newest first.</p>
          </div>

          {connected && (
            <section className="panel">
              <div className="panel-head"><h2>Add approved copy</h2></div>
              <div className="panel-body">
                <div className="grid-2">
                  <div className="field"><label>Channel</label>
                    <select value={eChannel} onChange={(e) => setEChannel(e.target.value)}>
                      {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                  <div className="field"><label>Label</label>
                    <input type="text" value={eLabel} onChange={(e) => setELabel(e.target.value)} placeholder="Pension reminder — Dentists" /></div>
                </div>
                <div className="field"><label>What to notice about it <span className="sub">— optional but valuable</span></label>
                  <input type="text" value={eNote} onChange={(e) => setENote(e.target.value)} placeholder="Proof point sits mid-email rather than opening it" /></div>
                <div className="field"><label>The copy</label>
                  <textarea rows={7} value={eBody} onChange={(e) => setEBody(e.target.value)} placeholder="Paste the approved piece exactly as it published." /></div>
                <div className="field"><label>Added by</label>
                  <input type="text" value={eBy} onChange={(e) => setEBy(e.target.value)} placeholder="Your name" style={{ maxWidth: 220 }} /></div>
                <button className="btn btn-primary" onClick={addExemplar}>Save exemplar</button>
              </div>
            </section>
          )}

          {exemplars.map((e) => (
            <section className="panel" key={String(e.id)}>
              <div className="panel-head">
                <h2>{e.label}</h2>
                <span className="hint">
                  <span className={`pill ${e.seeded ? "verified" : "disputed"}`}>{e.seeded ? "seeded" : e.added_by || "added"}</span>
                  {" "}{CHANNELS.find((c) => c.id === e.channel)?.name || e.channel}
                </span>
              </div>
              <div className="panel-body">
                {e.note && <p style={{ margin: "0 0 11px", fontSize: 12.5, color: "var(--ink-soft)" }}>{e.note}</p>}
                {open === String(e.id)
                  ? <div className="draft" style={{ border: "1px solid var(--rule)", padding: 16 }}>{e.body}</div>
                  : <p style={{ margin: "0 0 11px", fontSize: 13, color: "var(--ink-soft)" }}>{e.body.slice(0, 180)}…</p>}
                <div className="btn-row" style={{ marginTop: 11 }}>
                  <button className="btn-quiet" onClick={() => setOpen(open === String(e.id) ? null : String(e.id))}>
                    {open === String(e.id) ? "Collapse" : "Read it"}
                  </button>
                  {!e.seeded && <button className="btn-quiet" onClick={() => remove(e.id, "exemplar")}>Remove</button>}
                </div>
              </div>
            </section>
          ))}
        </>
      )}

      {tab === "questions" && (
        <>
          <div className="prose" style={{ marginBottom: 16 }}>
            <p>
              What advisors actually get asked. Content built on a real question
              outperforms content built on a topic someone chose in a planning
              meeting — and this feeds the FAQ format directly.
            </p>
            <p>Adding the same question again raises its count rather than duplicating it. Repetition is the signal worth keeping.</p>
          </div>

          {connected && (
            <section className="panel">
              <div className="panel-head"><h2>Record one</h2></div>
              <div className="panel-body">
                <div className="field"><label>Profession</label>
                  <div className="chips">
                    {PROFESSIONS.map((p) => (
                      <button key={p.id} className={qProf === p.id ? "chip on" : "chip"} onClick={() => setQProf(p.id)}>{p.name}</button>
                    ))}
                  </div></div>
                <div className="grid-2">
                  <div className="field"><label>Career stage <span className="sub">— optional</span></label>
                    <select value={qStage} onChange={(e) => setQStage(e.target.value)}>
                      <option value="">Any stage</option>
                      {CAREER_STAGES.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.range})</option>)}
                    </select></div>
                  <div className="field"><label>Kind</label>
                    <select value={qKind} onChange={(e) => setQKind(e.target.value)}>
                      <option value="question">Question they ask</option>
                      <option value="objection">Objection they raise</option>
                      <option value="misconception">Something they get wrong</option>
                    </select></div>
                </div>
                <div className="field"><label>In their words</label>
                  <input type="text" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Doesn't the practice cover me if I'm out sick?" /></div>
                <div className="grid-2">
                  <div className="field"><label>Context <span className="sub">— optional</span></label>
                    <input type="text" value={qContext} onChange={(e) => setQContext(e.target.value)} placeholder="Usually comes up before they've read the contract" /></div>
                  <div className="field"><label>Heard by <span className="sub">— optional</span></label>
                    <input type="text" value={qFrom} onChange={(e) => setQFrom(e.target.value)} placeholder="Advisor name" /></div>
                </div>
                <button className="btn btn-primary" onClick={addQuestion}>Record it</button>
              </div>
            </section>
          )}

          {!questions.length && (
            <div className="empty">
              <strong>Nothing recorded yet</strong>
              <p>Ask the advisors for the three questions they answer most often per profession. That is an hour of work and it changes what every piece is about.</p>
            </div>
          )}

          {questions.map((q) => (
            <div className={`claim ${q.kind === "misconception" ? "unverified" : "verified"}`} key={q.id}>
              <q>{q.text}</q>
              <div className="claim-foot">
                <span className="basis">{q.kind}</span>
                <span>
                  {PROFESSIONS.find((p) => p.id === q.profession)?.name || q.profession}
                  {q.stage ? ` · ${CAREER_STAGES.find((s) => s.id === q.stage)?.name}` : ""}
                  {q.times_heard > 1 ? ` · heard ${q.times_heard}x` : ""}
                  {q.context ? ` · ${q.context}` : ""}
                </span>
                <button className="btn-quiet" onClick={() => remove(q.id, "question")}>Remove</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
