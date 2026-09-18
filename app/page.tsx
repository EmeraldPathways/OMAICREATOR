"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Library from "@/components/Library";
import Queue from "@/components/Queue";
import Campaigns from "@/components/Campaigns";
import Knowledge from "@/components/Knowledge";
import Estate from "@/components/Estate";
import Interview from "@/components/Interview";
import VoiceBank from "@/components/VoiceBank";
import { CAREER_STAGES, frameworksFor, TRANSFORMS } from "@/lib/craft";
import HighlightedDraft, { type Flag } from "@/components/HighlightedDraft";
import { ROLES } from "@/lib/roles";
import type { PlainLanguageScore } from "@/lib/compliance";
import { CHANNELS, PROFESSIONS, TONES } from "@/lib/brand";
import FactsBase from "@/components/FactsBase";
import { PRIORITY_DOMAINS, type SearchResult } from "@/lib/search";
import CreationToolkit from "@/components/CreationToolkit";
import type { ContentPack } from "@/lib/contentPacks";
import BriefProgress from "@/components/BriefProgress";
import StatusBadge from "@/components/StatusBadge";
import { useDraftRecovery } from "@/hooks/useDraftRecovery";
import EvidencePanel from "@/components/EvidencePanel";
import ReviewSummary from "@/components/ReviewSummary";
import Activity from "@/components/Activity";

interface Draft {
  title: string;
  content: string;
  variants: string[];
  claims: { text: string; basis: string; quote: string }[];
  needs: string[];
  compliance: { disclaimer: string; regulatoryLine: string };
  notes: string;
}

interface LearnedMeta {
  mode: string;
  exemplars: number;
  facts: number;
  lessons: number;
  expired: { id: number; claim: string; value: string; expires_at: string }[];
}

interface Audit {
  verdict: "ready" | "revise" | "block";
  summary: string;
  claims: { text: string; status: string; basis: string; comment: string }[];
  compliance: { rule: string; status: string; detail: string; span?: string }[];
  voice: { issue: string; span?: string; fix: string }[];
}

interface Angle { title: string; pitch: string; why: string; risk: string }
interface Hook { text: string; kind: string; note: string }
interface SeriesPart { n: number; title: string; purpose: string; adds: string; holds_back: string; cta: string }
interface InterviewRef { id: number; advisor: string; topic: string; profession: string; stage: string | null }

interface Risk {
  score: number;
  band: string;
  drivers: string[];
}

interface CampaignRef {
  id: number;
  name: string;
  profession: string;
  layer: string;
  brief: string | null;
  objective: string | null;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState("email");

  const [format, setFormat] = useState("newsletter");
  const [profession, setProfession] = useState("gp");
  const [tone, setTone] = useState("educational");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [wordTarget, setWordTarget] = useState("");

  const [query, setQuery] = useState("");
  const [newsMode, setNewsMode] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const [draft, setDraft] = useState<Draft | null>(null);
  const [edited, setEdited] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);

  const [stage, setStage] = useState("mid");
  const [framework, setFramework] = useState("");
  const [angles, setAngles] = useState<Angle[]>([]);
  const [angle, setAngle] = useState<string>("");
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [interview, setInterview] = useState<InterviewRef | null>(null);
  const [arc, setArc] = useState<{ arc: string; parts: SeriesPart[] } | null>(null);
  const [seriesOut, setSeriesOut] = useState<{ n: number; title: string; body: string }[]>([]);
  const [carousel, setCarousel] = useState<{ slides: { n: number; role: string; copy: string; alt: string; svg: string }[]; caption: string; hashtags: string[] } | null>(null);
  const [transform, setTransform] = useState("simplify");
  const [transformNote, setTransformNote] = useState("");
  const [busyKind, setBusyKind] = useState("");
  const [plainDelta, setPlainDelta] = useState<{ before: PlainLanguageScore; after: PlainLanguageScore } | null>(null);

  const [campaign, setCampaign] = useState<CampaignRef | null>(null);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [plain, setPlain] = useState<PlainLanguageScore | null>(null);
  const [vulnerable, setVulnerable] = useState<string[]>([]);
  const [showMarks, setShowMarks] = useState(true);
  const [role, setRole] = useState("marketer");
  const [pieceId, setPieceId] = useState<number | null>(null);
  const [pushing, setPushing] = useState(false);

  const [approvedBy, setApprovedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [learned, setLearned] = useState<LearnedMeta | null>(null);
  const [snapshots, setSnapshots] = useState<{ label: string; content: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const savedSnapshots = window.localStorage.getItem("omega-draft-snapshots");
      return savedSnapshots ? JSON.parse(savedSnapshots) : [];
    } catch { return []; }
  });

  const [searching, setSearching] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState("draft");

  const channel = CHANNELS.find((c) => c.id === view);
  const isChannel = Boolean(channel);

  const recoveryBrief = useMemo(() => ({ profession, view, format, tone, topic, notes, wordTarget, stage, framework }), [profession, view, format, tone, topic, notes, wordTarget, stage, framework]);
  const recovery = useDraftRecovery("omega-content-studio-brief", recoveryBrief, isChannel);

  useEffect(() => {
    if (!edited.trim()) return;
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem("omega-draft-autosave", edited); } catch { /* optional local preference */ }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [edited]);

  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) runAudit(); else generate();
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("topic")?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });


  function restoreBrief() {
    const saved = recovery.recovered;
    if (!saved) return;
    setProfession(saved.profession || "gp");
    setView(saved.view || "email");
    setFormat(saved.format || "newsletter");
    setTone(saved.tone || "educational");
    setTopic(saved.topic || "");
    setNotes(saved.notes || "");
    setWordTarget(saved.wordTarget || "");
    setStage(saved.stage || "mid");
    setFramework(saved.framework || "");
    recovery.dismissRecovery();
  }

  const sources = useMemo(
    () =>
      results
        .filter((r) => picked[r.url])
        .map((r, i) => ({
          n: i + 1,
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          published: r.published,
        })),
    [results, picked]
  );

  function selectChannel(id: string) {
    setView(id);
    const c = CHANNELS.find((x) => x.id === id);
    if (c) setFormat(c.formats[0].id);
      setDraft(null);
    setDraftStatus("draft");
    setAudit(null);
    setEdited("");
    setLearned(null);
    setSaved("");
    setRisk(null);
    setPlain(null);
    setVulnerable([]);
    setPieceId(null);
    setAngles([]); setAngle(""); setHooks([]);
    setArc(null); setSeriesOut([]); setCarousel(null); setPlainDelta(null);
    setFramework("");
  }

  function craftBrief() {
    return {
      channel: view, format, profession, topic, tone, stage, framework, angle,
      notes: [campaign?.brief, notes].filter(Boolean).join("\n\n"),
      wordTarget,
    };
  }

  async function post(path: string, body: Record<string, unknown>, kind: string) {
    setBusyKind(kind); setError("");
    try {
      const res = await fetch(path, {
        method: body.__method === "PUT" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, __method: undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That failed.");
      return null;
    } finally { setBusyKind(""); }
  }

  async function findAngles() {
    if (!topic.trim()) { setError("Give it a topic first."); return; }
    const j = await post("/api/angles", { brief: craftBrief(), interviewId: interview?.id }, "angles");
    if (j) { setAngles(j.angles || []); setAngle(""); }
  }

  async function writeHooks() {
    if (!topic.trim()) { setError("Give it a topic first."); return; }
    const j = await post("/api/hooks", { brief: craftBrief(), body: edited, interviewId: interview?.id }, "hooks");
    if (j) setHooks(j.hooks || []);
  }

  async function rewrite() {
    if (!edited.trim()) { setError("There is nothing to rewrite."); return; }
    const j = await post("/api/rewrite", {
      brief: craftBrief(), text: edited, transform, instruction: transformNote,
      interviewId: interview?.id,
    }, "rewrite");
    if (j) {
      setDraft((d) => ({ ...(d || { title: topic, variants: [], claims: [], needs: [], compliance: { disclaimer: "", regulatoryLine: "" }, notes: "" }), ...j.draft }));
      setEdited(j.draft.content || "");
      setPlainDelta(j.plain || null);
      setAudit(null); setRisk(null); setPlain(null);
    }
  }

  async function planSeries(count: number) {
    const j = await post("/api/series", { brief: craftBrief(), count, interviewId: interview?.id }, "arc");
    if (j) { setArc({ arc: j.arc, parts: j.parts || [] }); setSeriesOut([]); }
  }

  async function writeSeries() {
    if (!arc) return;
    setBusyKind("series"); setError("");
    const done: { n: number; title: string; body: string }[] = [];
    try {
      for (const part of arc.parts) {
        const res = await fetch("/api/series", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: craftBrief(), part, arc: arc.arc, previous: done, interviewId: interview?.id }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        done.push({ n: part.n, title: part.title, body: j.draft?.content || "" });
        setSeriesOut([...done]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The sequence stopped partway. What was written is below.");
    } finally { setBusyKind(""); }
  }

  async function makeCarousel() {
    if (!topic.trim()) { setError("Give it a topic first."); return; }
    const j = await post("/api/carousel", {
      brief: craftBrief(), source: edited || undefined, interviewId: interview?.id,
    }, "carousel");
    if (j) setCarousel(j.carousel);
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, news: newsMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      if (!data.results?.length) setError("No results came back for that query.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function generate() {
    if (!topic.trim()) {
      setError("Give the piece a topic before drafting.");
      return;
    }
    setDrafting(true);
    setError("");
    setAudit(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: craftBrief(),
          interviewId: interview?.id || null,
          sources,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.draft);
      setDraftStatus("needs_review");
      setEdited(data.draft.content);
      setLearned(data.learned || null);
      setSaved("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setDrafting(false);
    }
  }

  async function runAudit() {
    if (!edited.trim()) return;
    setAuditing(true);
    setError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: edited,
          brief: { channel: view, format, profession, topic, tone },
          sources,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAudit(data.audit);
      setDraftStatus(data.audit?.verdict === "ready" ? "compliance_review" : "needs_review");
      setRisk(data.risk || null);
      setPlain(data.plain || null);
      setVulnerable(data.vulnerable || []);
      setShowMarks(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setAuditing(false);
    }
  }

  const flags: Flag[] = useMemo(() => {
    const out: Flag[] = [];
    for (const c of audit?.compliance || []) {
      if (c.status === "fail" && c.span) {
        out.push({ span: c.span, label: c.rule, detail: c.detail, severity: "fail" });
      }
    }
    for (const c of audit?.claims || []) {
      if (c.status !== "verified") {
        out.push({
          span: c.text,
          label: c.status === "contradicted" ? "Contradicted claim" : "Unverified claim",
          detail: c.comment,
          severity: "claim",
        });
      }
    }
    for (const v of audit?.voice || []) {
      if (v.span) out.push({ span: v.span, label: "Brand voice", detail: v.issue, fix: v.fix, severity: "voice" });
    }
    for (const ls of plain?.longSentences || []) {
      out.push({
        span: ls.text,
        label: "Long sentence",
        detail: `${ls.words} words. The plain language obligation wants this under 25.`,
        severity: "plain",
      });
    }
    return out;
  }, [audit, plain]);

  function applyFix(span: string, replacement: string) {
    setEdited((t) => t.replace(span, replacement));
    setAudit(null);
    setRisk(null);
    setPlain(null);
  }

  function saveSnapshot() {
    if (!edited.trim()) return;
    const next = [{ label: new Date().toLocaleString("en-IE"), content: edited }, ...snapshots].slice(0, 8);
    setSnapshots(next);
    try { window.localStorage.setItem("omega-draft-snapshots", JSON.stringify(next)); } catch { /* optional local preference */ }
    setSaved("Draft snapshot saved on this device.");
  }

  async function pushToHubspot() {
    setPushing(true);
    setError("");
    try {
      const res = await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: view === "email" ? "email" : "blog",
          title: draft?.title || topic,
          subject: draft?.variants?.[0] || topic,
          body: edited,
          pieceId,
          status: audit?.verdict === "block" ? "blocked" : "ok",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setSaved(`Pushed to HubSpot as a draft (id ${j.id}). Nothing is live until you publish it there.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The HubSpot push failed.");
    } finally {
      setPushing(false);
    }
  }

  async function approve() {
    if (!approvedBy.trim()) {
      setError("Put your name to it — an approval needs to be attributable.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: { channel: view, format, profession, topic, tone, notes },
          aiDraft: draft?.content,
          finalText: edited,
          verdict: audit?.verdict,
          sources,
          approvedBy,
          approverRole: role,
          campaignId: campaign?.id || null,
          careerStage: stage,
          framework: framework || null,
          interviewId: interview?.id || null,
          riskScore: risk?.score ?? null,
          status: role === "compliance" ? "approved" : "in_review",
          audit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPieceId(data.pieceId || null);
      setSaved(
        data.learned?.length
          ? `Saved. Your edits taught it: ${data.learned.join(" · ")}`
          : data.wasEdited
          ? "Saved. Nothing general enough to learn from these edits."
          : "Saved as approved. An unedited draft teaches nothing, which is the right outcome."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the piece.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        view={view}
        onSelect={selectChannel}
      />

      <div className="main">
        <header className="topbar">
          <h1>
            {channel
              ? channel.name
              : view === "facts"
              ? "Fact base"
              : view === "library"
              ? "Library"
              : view === "queue"
              ? "Review queue"
              : view === "campaigns"
              ? "Campaigns"
              : view === "activity"
              ? "Activity"
              : view === "knowledge"
              ? "Profession knowledge"
              : view === "estate"
              ? "Estate sweep"
              : view === "voice"
              ? "Voice bank"
              : view === "interview"
              ? "Advisor interview"
              : "Setup"}{" "}
            {channel && <em>— {channel.blurb}</em>}
          </h1>
          <div className="topbar-actions">
            {edited && (
              <button
                className="btn btn-secondary"
                onClick={() => navigator.clipboard.writeText(edited)}
              >
                Copy draft
              </button>
            )}
          </div>
        </header>

        {view === "library" && (
          <Library
            onUsePack={(pack: ContentPack) => {
              const professionByPack: Record<string, string> = {
                "vet-income": "vet",
                "physio-income": "physiotherapist",
                "gp-income": "gp",
                "dentist-income": "dentist",
                "hse-income": "hse",
                "consultant-income": "consultant",
                "surveyor-income": "surveyor",
                "pharmacist-income": "pharmacist",
              };
              setProfession(professionByPack[pack.id] || "gp");
              setTopic(pack.name);
              setNotes(`Use the ${pack.name} professional content pack.\n\nFocus on: ${pack.prompts.join(", ")}.`);
              setView("email");
              setFormat("newsletter");
            }}
          />
        )}
        {view === "queue" && <Queue />}
        {view === "activity" && <Activity />}
        {view === "knowledge" && <Knowledge />}
        {view === "estate" && <Estate />}
        {view === "voice" && <VoiceBank />}
        {view === "interview" && (
          <Interview
            onUse={(i) => {
              setInterview({ id: i.id, advisor: i.advisor, topic: i.topic, profession: i.profession, stage: i.stage });
              setProfession(i.profession);
              if (i.stage) setStage(i.stage);
              setTopic(i.topic);
              setView("linkedin");
              setFormat("short");
            }}
          />
        )}
        {view === "campaigns" && (
          <Campaigns
            onUse={(c) => {
              setCampaign({
                id: c.id, name: c.name, profession: c.profession,
                layer: c.layer, brief: c.brief, objective: c.objective,
              });
              setProfession(c.profession);
              setView("email");
              setFormat("newsletter");
            }}
          />
        )}
        {view === "facts" && <FactsBase />}
        {view === "setup" && <SetupView />}

        {isChannel && (
          <div className="workspace">
            <div className="column">
              {error && <div className="alert">{error}</div>}

              {learned && learned.expired.length > 0 && (
                <div className="needs">
                  <h3>Cached figures have expired</h3>
                  <p style={{ margin: "0 0 7px", fontSize: 12.5 }}>
                    These were verified once but are past their window, so the
                    writer was not allowed to use them. Re-check them in the
                    Library.
                  </p>
                  <ul>
                    {learned.expired.map((f) => (
                      <li key={f.id}>
                        {f.claim} — {f.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interview && (
                <div className="verdict ready" style={{ marginBottom: 16 }}>
                  <h3>Built on {interview.advisor}&apos;s interview</h3>
                  <p>
                    &ldquo;{interview.topic}&rdquo; — their answers go in ahead of
                    anything the model would otherwise generate.{" "}
                    <button className="btn-quiet" onClick={() => setInterview(null)}>Detach</button>
                  </p>
                </div>
              )}

              {campaign && (
                <div className="verdict ready" style={{ marginBottom: 16 }}>
                  <h3>Writing for: {campaign.name}</h3>
                  <p>
                    {campaign.layer === "soft"
                      ? "Soft layer — educate, no hard CTA."
                      : "Hard layer — this one drives the action."}
                    {campaign.objective ? ` Objective: ${campaign.objective}.` : ""}{" "}
                    <button className="btn-quiet" onClick={() => setCampaign(null)}>Detach</button>
                  </p>
                </div>
              )}

              <CreationToolkit
                topic={topic}
                profession={profession}
                format={format}
                channel={view}
                notes={notes}
                onNotesChange={setNotes}
              />

              {recovery.recovered && !topic.trim() && (
                <div className="recovery-banner" role="status">
                  <div><strong>Unfinished brief found</strong><span>Saved {new Date().toLocaleDateString("en-IE")} on this device.</span></div>
                  <div className="btn-row"><button className="btn btn-primary" onClick={restoreBrief}>Restore brief</button><button className="btn-quiet" onClick={recovery.clearRecovery}>Start fresh</button></div>
                </div>
              )}

              {/* ---------------------------------------------- brief -- */}
              <section className="panel">
                <div className="panel-head">
                  <h2>The brief</h2>
                </div>
                <div className="panel-body">
                  <div className="field">
                    <label>Format</label>
                    <div className="chips">
                      {channel!.formats.map((f) => (
                        <button
                          key={f.id}
                          className={format === f.id ? "chip on" : "chip"}
                          onClick={() => setFormat(f.id)}
                        >
                          {f.name}
                          <small>{f.hint}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label>Audience</label>
                    <div className="chips">
                      {PROFESSIONS.map((p) => (
                        <button
                          key={p.id}
                          className={profession === p.id ? "chip on" : "chip"}
                          onClick={() => setProfession(p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label>
                      Career stage <span className="sub">— a piece for everyone is a piece for nobody</span>
                    </label>
                    <div className="chips">
                      {CAREER_STAGES.map((st) => (
                        <button
                          key={st.id}
                          className={stage === st.id ? "chip on" : "chip"}
                          onClick={() => setStage(st.id)}
                        >
                          {st.name}
                          <small>{st.range}</small>
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const st = CAREER_STAGES.find((x) => x.id === stage);
                      const note = st?.byProfession[profession];
                      return note ? <p className="stage-note">{note}</p> : null;
                    })()}
                  </div>

                  {frameworksFor(view).length > 0 && (
                    <div className="field">
                      <label htmlFor="fw">
                        Structure <span className="sub">— what makes an Omega piece recognisable</span>
                      </label>
                      <select id="fw" value={framework} onChange={(e) => setFramework(e.target.value)}>
                        <option value="">Let it choose</option>
                        {frameworksFor(view).map((f) => (
                          <option key={f.id} value={f.id}>{f.name} — {f.hint}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="topic">
                      Topic <span className="sub">— what is this piece about?</span>
                    </label>
                    <input
                      id="topic"
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Income protection gaps for GPs on GMS contracts"
                    />
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label>Tone</label>
                      <select value={tone} onChange={(e) => setTone(e.target.value)}>
                        {TONES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {t.hint}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="wt">
                        Word target <span className="sub">— optional</span>
                      </label>
                      <input
                        id="wt"
                        type="text"
                        value={wordTarget}
                        onChange={(e) => setWordTarget(e.target.value)}
                        placeholder="700"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="notes">
                      Direction <span className="sub">— angle, must-mentions, what to avoid</span>
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Hook off the Budget. Do not mention association partnerships — we have none for GPs."
                    />
                  </div>
                </div>
              </section>

              {/* --------------------------------------------- sources -- */}
              <section className="panel">
                <div className="panel-head">
                  <h2>Live sources</h2>
                  <span className="hint">
                    {sources.length
                      ? `${sources.length} Irish source${sources.length === 1 ? "" : "s"} attached`
                      : "Irish sources only — Google Ireland focus"}
                  </span>
                </div>
                <div className="panel-body">
                  <div className="search-row">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="Illness Benefit rate Ireland 2026"
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={runSearch}
                      disabled={searching || !query.trim()}
                    >
                      {searching ? "Searching" : "Search"}
                    </button>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      gap: 7,
                      alignItems: "center",
                      fontSize: 12.5,
                      color: "var(--ink-soft)",
                      marginBottom: 6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newsMode}
                      onChange={(e) => setNewsMode(e.target.checked)}
                      style={{ accentColor: "var(--crimson)" }}
                    />
                    News only — last 90 days
                  </label>

                  {searching && (
                    <div className="busy">
                      <span className="spinner" /> Retrieving sources
                    </div>
                  )}

                  {!searching && !results.length && (
                    <div className="empty">
                      <strong>No sources yet</strong>
                      <p>
                        Without a source, the draft cannot state a rate, threshold
                        or statistic. It will write around the gap and tell you
                        what to look up.
                      </p>
                    </div>
                  )}

                  {results.map((r) => {
                    const host = hostOf(r.url);
                    const trusted = PRIORITY_DOMAINS.some((d) => host.endsWith(d));
                    return (
                      <div className="source" key={r.url}>
                        <input
                          type="checkbox"
                          checked={Boolean(picked[r.url])}
                          onChange={(e) =>
                            setPicked((p) => ({ ...p, [r.url]: e.target.checked }))
                          }
                          aria-label={`Attach ${r.title}`}
                        />
                        <div className="source-body">
                          <a href={r.url} target="_blank" rel="noreferrer">
                            {r.title}
                          </a>
                          <div className="source-meta">
                            <span className={trusted ? "trusted" : undefined}>
                              {host}
                              {trusted ? " · trusted for Irish financial facts" : ""}
                            </span>
                            {r.published ? ` · ${r.published}` : ""}
                          </div>
                          <p>{r.snippet.slice(0, 220)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2>Angles</h2>
                  <span className="hint">Choosing at the idea stage is cheaper than rewriting at the draft stage</span>
                </div>
                <div className="panel-body">
                  {!angles.length && (
                    <p style={{ margin: "0 0 13px", fontSize: 13, color: "var(--ink-soft)" }}>
                      Three genuinely different takes on the topic, as one-paragraph
                      pitches. Pick one and the draft is written to it.
                    </p>
                  )}
                  {angles.map((a, i) => (
                    <div
                      key={i}
                      className={angle === a.pitch ? "angle on" : "angle"}
                      onClick={() => setAngle(angle === a.pitch ? "" : a.pitch)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setAngle(angle === a.pitch ? "" : a.pitch); }}
                    >
                      <h4>{a.title}</h4>
                      <p>{a.pitch}</p>
                      <p className="why">{a.why}</p>
                      {a.risk && <p className="risk">Weakness: {a.risk}</p>}
                    </div>
                  ))}
                  <div className="btn-row" style={{ marginTop: angles.length ? 13 : 0 }}>
                    <button className="btn btn-secondary" onClick={findAngles} disabled={busyKind === "angles"}>
                      {busyKind === "angles" ? "Thinking" : angles.length ? "Try three more" : "Find three angles"}
                    </button>
                    {angle && <span style={{ fontSize: 12.5, color: "var(--pass)" }}>Angle chosen — the draft will be written to it.</span>}
                  </div>
                </div>
              </section>

              <BriefProgress steps={[{ label: "Channel", complete: Boolean(view) }, { label: "Format", complete: Boolean(format) }, { label: "Profession", complete: Boolean(profession) }, { label: "Topic", complete: Boolean(topic.trim()) }, { label: "Direction", complete: Boolean(notes.trim()) }]} />
              <div className="btn-row" style={{ marginBottom: 18 }}>
                <button className="btn btn-primary" onClick={generate} disabled={drafting}>
                  {drafting ? "Drafting" : draft ? "Draft again" : "Write the draft"}
                </button>
                <button className="btn btn-secondary" onClick={writeHooks} disabled={busyKind === "hooks"}>
                  {busyKind === "hooks" ? "Writing" : "15 hooks"}
                </button>
                {view === "instagram" && (
                  <button className="btn btn-secondary" onClick={makeCarousel} disabled={busyKind === "carousel"}>
                    {busyKind === "carousel" ? "Designing" : "Build the carousel"}
                  </button>
                )}
                {(view === "email" || view === "linkedin") && (
                  <button className="btn btn-secondary" onClick={() => planSeries(5)} disabled={busyKind === "arc"}>
                    {busyKind === "arc" ? "Planning" : "Plan a sequence"}
                  </button>
                )}
                {drafting && (
                  <span className="busy">
                    <span className="spinner" /> Grounding against the fact base
                  </span>
                )}
              </div>

              {hooks.length > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Hooks</h2>
                    <span className="hint">Click one to set it as the direction</span>
                  </div>
                  <div className="panel-body">
                    {hooks.map((h, i) => (
                      <div key={i} className="hook" role="button" tabIndex={0}
                        onClick={() => setNotes((n) => `${n ? n + "\n\n" : ""}Open with this: ${h.text}`)}
                        onKeyDown={(e) => { if (e.key === "Enter") setNotes((n) => `${n ? n + "\n\n" : ""}Open with this: ${h.text}`); }}>
                        <span className="kind">{h.kind}</span>
                        <span>{h.text}<em>{h.note}</em></span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {arc && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Sequence arc</h2>
                    <span className="hint">{arc.parts.length} parts</span>
                  </div>
                  <div className="panel-body">
                    <p style={{ margin: "0 0 14px", fontSize: 13 }}>{arc.arc}</p>
                    {arc.parts.map((p) => (
                      <div className="part" key={p.n}>
                        <h4>{p.n}. {p.title}</h4>
                        <dl>
                          <dt>Purpose</dt><dd>{p.purpose}</dd>
                          <dt>Adds</dt><dd>{p.adds}</dd>
                          <dt>Holds back</dt><dd>{p.holds_back}</dd>
                          <dt>Ask</dt><dd>{p.cta}</dd>
                        </dl>
                      </div>
                    ))}
                    <div className="btn-row" style={{ marginTop: 13 }}>
                      <button className="btn btn-primary" onClick={writeSeries} disabled={busyKind === "series"}>
                        {busyKind === "series" ? `Writing ${seriesOut.length + 1} of ${arc.parts.length}` : "Write every part"}
                      </button>
                      <button className="btn-quiet" onClick={() => { setArc(null); setSeriesOut([]); }}>Discard the arc</button>
                    </div>
                  </div>
                </section>
              )}

              {seriesOut.map((p) => (
                <section className="panel" key={p.n}>
                  <div className="panel-head">
                    <h2>Part {p.n}: {p.title}</h2>
                    <span className="hint">
                      <button className="btn-quiet" onClick={() => { setEdited(p.body); setDraft((d) => ({ ...(d || { variants: [], claims: [], needs: [], compliance: { disclaimer: "", regulatoryLine: "" }, notes: "" }), title: p.title, content: p.body })); setAudit(null); }}>
                        Load into the editor
                      </button>
                    </span>
                  </div>
                  <div className="draft">{p.body}</div>
                </section>
              ))}

              {carousel && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Carousel</h2>
                    <span className="hint">{carousel.slides.length} slides, brand palette, ready to export</span>
                  </div>
                  <div className="slides">
                    {carousel.slides.map((sl) => (
                      <div className="slide" key={sl.n}>
                        <div dangerouslySetInnerHTML={{ __html: sl.svg }} />
                        <div className="cap"><b>{sl.role}</b> — {sl.copy}</div>
                      </div>
                    ))}
                  </div>
                  <div className="panel-body" style={{ borderTop: "1px solid var(--rule)" }}>
                    <div className="field">
                      <label>Caption</label>
                      <textarea rows={5} value={carousel.caption} readOnly />
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {(carousel.hashtags || []).join(" ")}
                    </p>
                  </div>
                </section>
              )}

              {/* ----------------------------------------------- draft -- */}
              {draft && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>{draft.title}</h2>
                    <span className="hint"><StatusBadge status={draftStatus} />{" "}
                      {learned && learned.mode !== "off"
                        ? `Drew on ${learned.exemplars} approved ${
                            learned.exemplars === 1 ? "piece" : "pieces"
                          }, ${learned.facts} verified ${
                            learned.facts === 1 ? "figure" : "figures"
                          }, ${learned.lessons} learned ${
                            learned.lessons === 1 ? "correction" : "corrections"
                          }`
                        : "Editable — audit runs on what you see"} · {edited.trim() ? edited.trim().split(/\s+/).length : 0} words
                    </span>
                  </div>
                  <EvidencePanel learned={learned} sources={sources} />
                  {audit && flags.length > 0 && (
                    <div style={{ padding: "12px 18px 0" }}>
                      <div className="toggle-row" style={{ display: "inline-flex" }}>
                        <button className={showMarks ? "on" : ""} onClick={() => setShowMarks(true)}>
                          Flagged ({flags.length})
                        </button>
                        <button className={!showMarks ? "on" : ""} onClick={() => setShowMarks(false)}>
                          Edit
                        </button>
                      </div>
                    </div>
                  )}

                  {audit && flags.length > 0 && showMarks ? (
                    <HighlightedDraft text={edited} flags={flags} onApply={applyFix} />
                  ) : (
                    <textarea
                      className="draft"
                      value={edited}
                      onChange={(e) => setEdited(e.target.value)}
                      rows={22}
                    />
                  )}
                  {draft.variants?.length > 0 && (
                    <div className="variants">
                      <h3>Alternative headlines and hooks</h3>
                      <ul>
                        {draft.variants.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="draft-tools">
                    <button className="btn-quiet" onClick={() => { setTransform("shorten"); setTransformNote("Keep every material caveat and reduce unnecessary wording."); }}>Shorten draft</button>
                    <button className="btn-quiet" onClick={() => { setTransform("simplify"); setTransformNote("Use plain language for an Irish client."); }}>Simplify language</button>
                    <button className="btn-quiet" onClick={saveSnapshot}>Save snapshot</button>
                    {snapshots.length > 0 && <select aria-label="Restore draft snapshot" onChange={(e) => { const s = snapshots[Number(e.target.value)]; if (s) setEdited(s.content); }} defaultValue=""><option value="" disabled>Restore snapshot</option>{snapshots.map((s, i) => <option value={i} key={`${s.label}-${i}`}>{s.label}</option>)}</select>}
                  </div>
                </section>
              )}

              {draft && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Rewrite</h2>
                    <span className="hint">Most real work is improvement, not creation</span>
                  </div>
                  <div className="panel-body">
                    {plainDelta && (
                      <div className="verdict ready" style={{ marginBottom: 13 }}>
                        <p>
                          Reading ease moved from {plainDelta.before.readingEase} to{" "}
                          {plainDelta.after.readingEase}, grade {plainDelta.before.gradeLevel} to{" "}
                          {plainDelta.after.gradeLevel}. Long sentences:{" "}
                          {plainDelta.before.longSentences.length} to {plainDelta.after.longSentences.length}.
                        </p>
                      </div>
                    )}
                    <div className="field">
                      <div className="chips">
                        {TRANSFORMS.map((t) => (
                          <button key={t.id} className={transform === t.id ? "chip on" : "chip"} onClick={() => setTransform(t.id)}>
                            {t.name}<small>{t.hint}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="tn">
                        Anything specific <span className="sub">— optional</span>
                      </label>
                      <input id="tn" type="text" value={transformNote}
                        onChange={(e) => setTransformNote(e.target.value)}
                        placeholder={transform === "reaim" ? "Aim it at a late-career consultant instead" : transform === "shorten" ? "Get it to 400 words" : "Anything to hold on to"} />
                    </div>
                    <div className="btn-row">
                      <button className="btn btn-secondary" onClick={rewrite} disabled={busyKind === "rewrite"}>
                        {busyKind === "rewrite" ? "Rewriting" : "Apply"}
                      </button>
                      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        A rewrite can never add a claim or drop a caveat, whatever the transform asks.
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {draft && (
                <div className="btn-row" style={{ marginBottom: 18 }}>
                  <button className="btn btn-primary" onClick={runAudit} disabled={auditing}>
                    {auditing ? "Auditing" : "Run the audit"}
                  </button>
                  {auditing && (
                    <span className="busy">
                      <span className="spinner" /> Checking every claim
                    </span>
                  )}
                </div>
              )}

              {audit && <ReviewSummary audit={audit} />}

              {draft && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Sign off</h2>
                    <span className="hint">
                      Approved work becomes a reference for future drafts
                    </span>
                  </div>
                  <div className="panel-body">
                    {saved && (
                      <div
                        className="verdict ready"
                        style={{ marginBottom: 14 }}
                      >
                        <p>{saved}</p>
                      </div>
                    )}
                    <p
                      style={{
                        margin: "0 0 13px",
                        fontSize: 13,
                        color: "var(--ink-soft)",
                      }}
                    >
                      Approving stores the draft, your edited version, and the gap
                      between them. If your edits show a pattern worth repeating,
                      it becomes a standing correction.
                    </p>
                    <div className="btn-row" style={{ marginBottom: 11 }}>
                      <input
                        type="text"
                        value={approvedBy}
                        onChange={(e) => setApprovedBy(e.target.value)}
                        placeholder="Your name"
                        style={{ maxWidth: 200 }}
                      />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{ maxWidth: 250 }}
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} — {r.can}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="btn-row">
                      <button className="btn btn-primary" onClick={approve} disabled={saving}>
                        {saving
                          ? "Saving"
                          : role === "compliance"
                          ? "Approve and save"
                          : "Submit for review"}
                      </button>
                      {pieceId && (view === "email" || view === "website") && (
                        <button className="btn btn-secondary" onClick={pushToHubspot} disabled={pushing}>
                          {pushing ? "Pushing" : "Push to HubSpot as draft"}
                        </button>
                      )}
                    </div>
                    {role !== "compliance" && (
                      <p style={{ margin: "11px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                        Only the compliance role can approve. This goes to the
                        review queue, ordered by risk score.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* ----------------------------------------------- ledger -- */}
            <div className="column ledger-col">
              <Ledger draft={draft} audit={audit} risk={risk} plain={plain} vulnerable={vulnerable} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ ledger -- */

function Ledger({
  draft, audit, risk, plain, vulnerable,
}: {
  draft: Draft | null;
  audit: Audit | null;
  risk: Risk | null;
  plain: PlainLanguageScore | null;
  vulnerable: string[];
}) {
  if (!draft && !audit) {
    return (
      <div className="empty">
        <strong>Claim ledger</strong>
        <p>
          Once a draft exists, every assertion in it is listed here with what it
          rests on — an approved fact, a cited source, or nothing at all.
        </p>
      </div>
    );
  }

  return (
    <>
      {risk && (
        <div className="ledger-group">
          <h3>Risk score</h3>
          <div className="btn-row" style={{ marginBottom: 6 }}>
            <span className={`score score-${risk.band}`}>{risk.score} / 100 · {risk.band}</span>
          </div>
          <div className="meter">
            <span
              style={{
                width: `${Math.max(risk.score, 2)}%`,
                background:
                  risk.score < 20 ? "var(--pass)" : risk.score < 50 ? "var(--warn)" : "var(--fail)",
              }}
            />
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "4px 0 0" }}>
            {risk.drivers.length ? risk.drivers.join(" · ") : "Nothing flagged."}
          </p>
        </div>
      )}

      {plain && (
        <div className="ledger-group">
          <h3>Plain language</h3>
          <div className="rule-row">
            <span className={`tick ${plain.verdict === "too complex" ? "fail" : "pass"}`}>
              {plain.verdict === "too complex" ? "✕" : "✓"}
            </span>
            <div>
              <b>{plain.verdict}</b>
              <em>{plain.summary}</em>
            </div>
          </div>
          {plain.jargonHits.length > 0 && (
            <div className="rule-row">
              <span className="tick fail">✕</span>
              <div><b>Jargon</b><em>{plain.jargonHits.join(", ")}</em></div>
            </div>
          )}
          {plain.passiveHits.length > 2 && (
            <div className="rule-row">
              <span className="tick fail">✕</span>
              <div><b>Passive voice</b><em>{plain.passiveHits.slice(0, 4).join(", ")}</em></div>
            </div>
          )}
        </div>
      )}

      {vulnerable.length > 0 && (
        <div className="needs">
          <h3>Touches vulnerable circumstances</h3>
          <p style={{ margin: 0, fontSize: 12.5 }}>
            This copy mentions {vulnerable.slice(0, 5).join(", ")}. Under the 2026
            Code, read it once more for tone: inform, do not frighten, and do not
            imply urgency the reader has not chosen.
          </p>
        </div>
      )}

      {audit && (
        <div className={`verdict ${audit.verdict}`}>
          <h3>
            {audit.verdict === "ready"
              ? "Ready for human sign-off"
              : audit.verdict === "revise"
              ? "Needs revision"
              : "Do not publish"}
          </h3>
          <p>{audit.summary}</p>
        </div>
      )}

      {draft?.needs?.length ? (
        <div className="needs">
          <h3>Look these up before publishing</h3>
          <ul>
            {draft.needs.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {audit?.claims?.length ? (
        <div className="ledger-group">
          <h3>Claims — audited</h3>
          {audit.claims.map((c, i) => (
            <div className={`claim ${c.status}`} key={i}>
              <q>{c.text}</q>
              <div className="claim-foot">
                <span className="basis">{c.basis || "no basis"}</span>
                <span>{c.comment}</span>
              </div>
            </div>
          ))}
        </div>
      ) : draft?.claims?.length ? (
        <div className="ledger-group">
          <h3>Claims — as written</h3>
          {draft.claims.map((c, i) => (
            <div
              className={`claim ${
                c.basis === "UNVERIFIED" || !c.basis ? "unverified" : "verified"
              }`}
              key={i}
            >
              <q>{c.text}</q>
              <div className="claim-foot">
                <span className="basis">{c.basis || "UNVERIFIED"}</span>
                <span>{c.quote}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {audit?.compliance?.length ? (
        <div className="ledger-group">
          <h3>Compliance</h3>
          {audit.compliance.map((r, i) => (
            <div className="rule-row" key={i}>
              <span className={`tick ${r.status}`}>
                {r.status === "pass" ? "✓" : "✕"}
              </span>
              <div>
                <b>{r.rule}</b>
                <em>{r.detail}</em>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {audit?.voice?.length ? (
        <div className="ledger-group">
          <h3>Brand voice</h3>
          {audit.voice.map((v, i) => (
            <div className="claim" key={i}>
              <q>{v.issue}</q>
              <div className="claim-foot">
                <span className="basis">fix</span>
                <span>{v.fix}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {draft?.notes && (
        <div className="ledger-group">
          <h3>Reviewer notes</h3>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
            {draft.notes}
          </p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------- facts -- */

/* ------------------------------------------------------------- setup -- */

function SetupView() {
  return (
    <div className="column">
      <section className="panel">
        <div className="panel-head">
          <h2>Keys</h2>
        </div>
        <div className="panel-body prose">
          <p>
            Both keys live server-side as Vercel environment variables. They are
            never sent to the browser, so a client can open the tool without
            being able to read them.
          </p>
          <h3>In Vercel — Settings, Environment Variables</h3>
          <p>
            <code>OPENAI_API_KEY</code> — your OpenAI key.
            <br />
            <code>OPENAI_MODEL</code> — set this to <code>gpt-5.6-luna</code> for GPT-5.6 Luna, the cost-sensitive model.
            <br />
            <code>SEARCH_PROVIDER</code> — <code>serper</code> for Google Ireland, or <code>tavily</code>/<code>brave</code>.
            <br />
            <code>SEARCH_API_KEY</code> — the key for whichever you chose.
          </p>
          <p>
            Redeploy after adding them. Environment variables are only picked up
            at build time.
          </p>
          <h3>Which search provider</h3>
          <p>
            Serper is the default because it queries Google with Ireland as the
            country and English Ireland as the language. News results are then
            restricted to Irish domains and public Irish authorities. Tavily and
            Brave remain available as alternatives.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>What this tool does and does not do</h2>
        </div>
        <div className="panel-body prose">
          <p>
            It will not invent an Omega fact, because the fact base is the only
            thing it is allowed to draw on. It will not state a rate, threshold
            or statistic unless you attached a source saying so. It marks
            everything it could not verify rather than smoothing over the gap.
          </p>
          <p>
            It can still be wrong. A model can misread a source, or a source can
            itself be out of date. The audit pass catches a good deal of that by
            re-reading the draft cold, but the claim ledger exists so a person
            checks the handful of things that matter instead of re-reading
            everything. Treat a green verdict as &quot;worth your time to
            review&quot;, not as approval.
          </p>
          <p>
            Nothing here is compliance sign-off. Regulated content still goes
            through the review workflow in the brand guide.
          </p>
        </div>
      </section>
    </div>
  );
}
