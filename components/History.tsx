"use client";

import { useEffect, useMemo, useState } from "react";

export const HISTORY_TABS = [
  { id: "email", label: "Email" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "website", label: "Web Article" },
  { id: "print", label: "Print Article" },
] as const;

type HistoryChannel = (typeof HISTORY_TABS)[number]["id"];

interface HistoryPiece {
  id: number;
  channel: HistoryChannel;
  format: string;
  profession: string;
  topic: string;
  final_text: string;
  was_edited: boolean | number;
  status: string;
  approved_by: string;
  approved_at: string;
  verdict: string | null;
}

interface HistoryProps {
  brandId: string;
  brandName: string;
  onCreate: (channel: string) => void;
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function History({ brandId, brandName, onCreate }: HistoryProps) {
  const [activeChannel, setActiveChannel] = useState<HistoryChannel>("email");
  const [pieces, setPieces] = useState<HistoryPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const activeTab = useMemo(
    () => HISTORY_TABS.find((tab) => tab.id === activeChannel) || HISTORY_TABS[0],
    [activeChannel],
  );

  useEffect(() => {
    let current = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setFeedback("");
      try {
        const response = await fetch(
          `/api/history?brandId=${encodeURIComponent(brandId)}&channel=${activeChannel}`,
          { cache: "no-store" },
        );
        const payload = await response.json() as { pieces?: HistoryPiece[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load content history.");
        if (current) setPieces(Array.isArray(payload.pieces) ? payload.pieces : []);
      } catch (reason: unknown) {
        if (current) {
          setPieces([]);
          setError(reason instanceof Error ? reason.message : "Could not load content history.");
        }
      } finally {
        if (current) setLoading(false);
      }
    };

    void load();

    return () => { current = false; };
  }, [brandId, activeChannel, reloadToken]);

  async function copyPiece(piece: HistoryPiece) {
    try {
      await navigator.clipboard.writeText(piece.final_text);
      setFeedback(`Copied “${piece.topic || activeTab.label}” to the clipboard.`);
    } catch {
      setFeedback("Copy is unavailable in this browser. Select the expanded text and copy it manually.");
    }
  }

  return (
    <main className="history-view" aria-labelledby="history-title">
      <div className="history-heading">
        <div>
          <span className="panel-kicker">CONTENT HISTORY</span>
          <h2 id="history-title">Saved content for {brandName}</h2>
          <p>Find approved and in-review work by channel. Nothing is published from this archive.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => onCreate(activeChannel)}>
          Create {activeTab.label}
        </button>
      </div>

      <div className="history-tabs" role="tablist" aria-label="Content history channels">
        {HISTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`history-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeChannel === tab.id}
            aria-controls={`history-panel-${tab.id}`}
            className={activeChannel === tab.id ? "history-tab active" : "history-tab"}
            onClick={() => setActiveChannel(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="history-feedback" role="status" aria-live="polite">{feedback}</div>

      <section
        id={`history-panel-${activeChannel}`}
        className="history-panel"
        role="tabpanel"
        aria-labelledby={`history-tab-${activeChannel}`}
        aria-busy={loading}
      >
        {loading && <div className="history-state"><strong>Loading history…</strong><span>Checking saved {activeTab.label.toLowerCase()} content.</span></div>}

        {!loading && error && (
          <div className="history-state history-state-error" role="alert">
            <strong>Could not load content history.</strong>
            <span>{error}</span>
            <button className="btn btn-secondary" type="button" onClick={() => setReloadToken((value) => value + 1)}>Try again</button>
          </div>
        )}

        {!loading && !error && pieces.length === 0 && (
          <div className="history-state">
            <strong>No saved {activeTab.label.toLowerCase()} content yet.</strong>
            <span>Create and save a {activeTab.label.toLowerCase()} draft to see it here.</span>
            <button className="btn btn-secondary" type="button" onClick={() => onCreate(activeChannel)}>Start {activeTab.label}</button>
          </div>
        )}

        {!loading && !error && pieces.length > 0 && (
          <div className="history-list">
            {pieces.map((piece) => (
              <article className="history-card" key={piece.id}>
                <div className="history-card-head">
                  <div>
                    <h3>{piece.topic || "Untitled content"}</h3>
                    <p>{titleCase(piece.format)} <span aria-hidden="true">·</span> {piece.profession || "General audience"}</p>
                  </div>
                  <span className={`history-status ${piece.status === "approved" ? "approved" : "review"}`}>
                    {statusLabel(piece.status || "in review")}
                  </span>
                </div>
                <div className="history-meta">
                  <span>{formatDate(piece.approved_at)}</span>
                  <span>Signed off by {piece.approved_by || "Studio owner"}</span>
                  {Boolean(piece.was_edited) && <span>Edited before saving</span>}
                </div>
                {piece.verdict && <p className="history-verdict">Compliance: {statusLabel(piece.verdict)}</p>}
                <p className="history-excerpt">{piece.final_text.length > 280 ? `${piece.final_text.slice(0, 280).trim()}…` : piece.final_text}</p>
                <details className="history-details">
                  <summary>Read full content</summary>
                  <div className="history-full-text">{piece.final_text}</div>
                </details>
                <div className="history-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => copyPiece(piece)}>Copy content</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
