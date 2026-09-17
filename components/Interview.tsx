"use client";

import { useEffect, useState } from "react";
import { PROFESSIONS } from "@/lib/brand";
import { CAREER_STAGES } from "@/lib/craft";

interface Q { n: number; q: string; why: string; a?: string }
interface Saved {
  id: number; advisor: string; profession: string; stage: string | null;
  topic: string; transcript: { q: string; a: string }[]; created_at: string;
}

export default function Interview({ onUse }: { onUse: (i: Saved) => void }) {
  const [advisor, setAdvisor] = useState("");
  const [profession, setProfession] = useState("gp");
  const [stage, setStage] = useState("");
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [id, setId] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/interview");
      const j = await res.json();
      setSaved(j.interviews || []);
    } catch { /* the list is a convenience */ }
  }
  useEffect(() => { load(); }, []);

  async function makeQuestions() {
    if (!topic.trim()) { setMsg("What is the interview about?"); return; }
    setBusy("q"); setMsg("");
    try {
      const res = await fetch("/api/interview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: { channel: "linkedin", profession, topic, stage } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setQuestions((j.questions || []).map((q: Q) => ({ ...q, a: "" })));
      setId(null);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not write the questions."); }
    finally { setBusy(""); }
  }

  async function save() {
    if (!advisor.trim()) { setMsg("Whose interview is this?"); return; }
    setBusy("save"); setMsg("");
    try {
      const res = await fetch("/api/interview", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, advisor, profession, stage, topic,
          transcript: questions.map((q) => ({ q: q.q, a: q.a || "" })) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setId(j.id);
      setMsg(`Saved ${j.answered} ${j.answered === 1 ? "answer" : "answers"}. Attach it when you draft and the copy will be built on what was actually said.`);
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(""); }
  }

  const answered = questions.filter((q) => q.a?.trim()).length;

  return (
    <div className="column">
      {msg && <div className={msg.startsWith("Saved") ? "verdict ready" : "alert"}>
        {msg.startsWith("Saved") ? <p>{msg}</p> : msg}</div>}

      <div className="prose" style={{ marginBottom: 16 }}>
        <p>
          The specificity that separates Omega from a generalist firm lives in the
          advisors&apos; heads, not in a language model. Twenty minutes with Declan
          or John produces material no amount of prompting will.
        </p>
        <p>
          The questions are written to pull out what a model could not otherwise
          generate — the objection they actually hear, the thing clients
          consistently get wrong, the case that changed how they explain
          something. Answer in whatever form is easiest; rough notes are fine.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Set up the interview</h2></div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="field"><label>Advisor</label>
              <input type="text" value={advisor} onChange={(e) => setAdvisor(e.target.value)} placeholder="Who is being interviewed" /></div>
            <div className="field"><label>Topic</label>
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Income protection conversations with GPs" /></div>
          </div>
          <div className="field"><label>About which clients</label>
            <div className="chips">
              {PROFESSIONS.map((p) => (
                <button key={p.id} className={profession === p.id ? "chip on" : "chip"} onClick={() => setProfession(p.id)}>{p.name}</button>
              ))}
            </div>
          </div>
          <div className="field"><label>Career stage <span className="sub">— optional</span></label>
            <div className="chips">
              <button className={!stage ? "chip on" : "chip"} onClick={() => setStage("")}>Any</button>
              {CAREER_STAGES.map((s) => (
                <button key={s.id} className={stage === s.id ? "chip on" : "chip"} onClick={() => setStage(s.id)}>
                  {s.name}<small>{s.range}</small>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={makeQuestions} disabled={busy === "q"}>
            {busy === "q" ? "Writing questions" : questions.length ? "New questions" : "Write the questions"}
          </button>
          {busy === "q" && <span className="busy" style={{ marginLeft: 12 }}><span className="spinner" /> Working out what to ask</span>}
        </div>
      </section>

      {questions.map((q, i) => (
        <section className="panel" key={q.n}>
          <div className="panel-head">
            <h2>{q.n}. {q.q}</h2>
            <span className="hint">{q.why}</span>
          </div>
          <div className="panel-body">
            <textarea rows={4} value={q.a || ""} placeholder="Their answer, in whatever form is easiest."
              onChange={(e) => setQuestions((qs) => qs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
          </div>
        </section>
      ))}

      {questions.length > 0 && (
        <div className="btn-row">
          <button className="btn btn-primary" onClick={save} disabled={busy === "save" || !answered}>
            {busy === "save" ? "Saving" : `Save ${answered} of ${questions.length}`}
          </button>
          {!answered && <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Answer at least one before saving.</span>}
        </div>
      )}

      {saved.length > 0 && (
        <div className="ledger-group" style={{ marginTop: 26 }}>
          <h3>Saved interviews</h3>
          {saved.map((s) => (
            <div className="claim verified" key={s.id}>
              <q><b>{s.topic}</b> — {s.advisor}</q>
              <div className="claim-foot">
                <span className="basis">{s.profession}</span>
                <span>
                  {(s.transcript || []).length} answers · {String(s.created_at).slice(0, 10)}
                </span>
                <button className="btn-quiet" onClick={() => onUse(s)}>Write from this</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
