"use client";

import { useMemo, useState } from "react";

export interface Flag {
  span: string;
  label: string;
  detail: string;
  fix?: string;
  severity: "fail" | "voice" | "claim" | "plain";
}

interface Props {
  text: string;
  flags: Flag[];
  onApply: (span: string, replacement: string) => void;
}

interface Segment {
  text: string;
  flag?: Flag;
  key: string;
}

/**
 * Splits the draft around every flagged span so the problem is visible where it
 * occurs, rather than in a list the reader has to match back to the text.
 * Spans the model could not quote exactly are dropped rather than
 * fuzzy-matched — a highlight on the wrong words is worse than no highlight.
 */
function segment(text: string, flags: Flag[]): Segment[] {
  const usable = flags
    .filter((f) => f.span && f.span.trim().length > 3 && text.includes(f.span))
    .sort((a, b) => b.span.length - a.span.length);

  type Mark = { start: number; end: number; flag: Flag };
  const marks: Mark[] = [];

  for (const f of usable) {
    let from = 0;
    let i: number;
    while ((i = text.indexOf(f.span, from)) !== -1) {
      const end = i + f.span.length;
      const overlaps = marks.some((m) => i < m.end && end > m.start);
      if (!overlaps) marks.push({ start: i, end, flag: f });
      from = end;
    }
  }

  marks.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let cursor = 0;
  marks.forEach((m, idx) => {
    if (m.start > cursor) {
      out.push({ text: text.slice(cursor, m.start), key: `t${idx}` });
    }
    out.push({ text: text.slice(m.start, m.end), flag: m.flag, key: `m${idx}` });
    cursor = m.end;
  });
  if (cursor < text.length) out.push({ text: text.slice(cursor), key: "tail" });

  return out;
}

export default function HighlightedDraft({ text, flags, onApply }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const segments = useMemo(() => segment(text, flags), [text, flags]);

  const unplaced = flags.filter(
    (f) => !f.span || f.span.trim().length <= 3 || !text.includes(f.span)
  );

  return (
    <>
      <div className="draft marked">
        {segments.map((s) =>
          s.flag ? (
            <span key={s.key} className="mark-wrap">
              <mark
                className={`mk mk-${s.flag.severity}`}
                onClick={() => setOpen(open === s.key ? null : s.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(open === s.key ? null : s.key);
                  }
                }}
                title={s.flag.label}
              >
                {s.text}
              </mark>
              {open === s.key && (
                <span className="mark-pop">
                  <b>{s.flag.label}</b>
                  <i>{s.flag.detail}</i>
                  {s.flag.fix && (
                    <>
                      <u>{s.flag.fix}</u>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          onApply(s.flag!.span, s.flag!.fix!);
                          setOpen(null);
                        }}
                      >
                        Use this wording
                      </button>
                    </>
                  )}
                </span>
              )}
            </span>
          ) : (
            <span key={s.key}>{s.text}</span>
          )
        )}
      </div>

      {unplaced.length > 0 && (
        <div className="variants">
          <h3>Flagged but not locatable in the text</h3>
          <ul>
            {unplaced.map((f, i) => (
              <li key={i}>
                <b>{f.label}</b> — {f.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
