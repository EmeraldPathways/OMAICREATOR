"use client";

import { useMemo, useState } from "react";
import { packFor } from "@/lib/contentPacks";

interface Props {
  topic: string;
  profession: string;
  format: string;
  channel: string;
  notes: string;
  onNotesChange: (value: string) => void;
}

export default function CreationToolkit({ topic, profession, format, channel, notes, onNotesChange }: Props) {
  const [showPlan, setShowPlan] = useState(false);
  const pack = useMemo(() => packFor(profession, topic), [profession, topic]);
  const steps = [Boolean(channel), Boolean(format), Boolean(profession), Boolean(topic.trim()), Boolean(notes.trim())];
  const complete = steps.filter(Boolean).length;
  const outline = [
    `Opening tension for ${pack.name}`,
    "Explain the practical issue in plain language",
    "Show what to review and why it matters",
    "Close with a measured next step",
  ];

  function addPrompt(prompt: string) {
    onNotesChange(`${notes ? `${notes.trim()}\n\n` : ""}${prompt}`);
  }

  return (
    <section className="panel toolkit">
      <div className="panel-head">
        <h2>Creation guide</h2>
        <span className="hint">{complete}/5 brief inputs ready · GPT-5.6 Luna</span>
      </div>
      <div className="panel-body">
        <div className="progress-track" aria-label={`${complete} of 5 brief inputs complete`}><span style={{ width: `${complete * 20}%` }} /></div>
        <div className="toolkit-grid">
          <div>
            <strong>Profession pack</strong>
            <p>{pack.summary}</p>
            <small>Source material: {pack.source}</small>
          </div>
          <div>
            <strong>Quick directions</strong>
            <div className="chips compact-chips">
              {pack.prompts.map((prompt) => <button className="chip" key={prompt} onClick={() => addPrompt(`Emphasise ${prompt}.`)}>{prompt}</button>)}
            </div>
          </div>
        </div>
        <div className="toolkit-actions">
          <button className="btn btn-secondary" onClick={() => setShowPlan((v) => !v)}>{showPlan ? "Hide outline" : "Plan outline"}</button>
          <span className="hint">Ctrl/⌘ + Enter writes · Ctrl/⌘ + Shift + Enter audits</span>
        </div>
        {showPlan && <ol className="outline-list">{outline.map((item) => <li key={item}>{item}</li>)}</ol>}
      </div>
    </section>
  );
}
