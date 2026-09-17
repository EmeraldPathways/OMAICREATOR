"use client";

import { CHANNELS } from "@/lib/brand";

const ICONS: Record<string, React.ReactNode> = {
  email: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="16" height="12" rx="1.5" />
      <path d="M2.5 5.5 10 11l7.5-5.5" />
    </svg>
  ),
  linkedin: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
      <path d="M6 8.5v5M6 5.6v.1M9.5 13.5v-5M9.5 10.2c0-1 .8-1.7 1.8-1.7s1.7.7 1.7 1.7v3.3" />
    </svg>
  ),
  instagram: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" />
      <circle cx="10" cy="10" r="3.4" />
      <circle cx="14.4" cy="5.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  website: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2 2.4 2.9 4.9 2.9 7.5S12 15.1 10 17.5c-2-2.4-2.9-4.9-2.9-7.5S8 4.9 10 2.5Z" />
    </svg>
  ),
  print: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5.5 7.5v-4h9v4" />
      <rect x="2.5" y="7.5" width="15" height="7" rx="1.5" />
      <rect x="5.5" y="12" width="9" height="5" />
    </svg>
  ),
  facts: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 3.5h9l3 3v10H4z" />
      <path d="M7 9h6M7 12h4" />
    </svg>
  ),
  interview: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2.5a3 3 0 0 1 3 3v3a3 3 0 0 1-6 0v-3a3 3 0 0 1 3-3Z" /><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5v3" />
    </svg>
  ),
  voice: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 5.5h13M3.5 9h13M3.5 12.5h8" /><path d="M13.5 15.5l2 2 3-4" />
    </svg>
  ),
  campaigns: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7.5 10 3l7 4.5-7 4.5z" /><path d="M3 12.5 10 17l7-4.5" />
    </svg>
  ),
  queue: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5.5h12M4 10h12M4 14.5h7" /><circle cx="15.5" cy="14.5" r="2.2" />
    </svg>
  ),
  knowledge: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.5" /><path d="M8 8a2 2 0 1 1 2.7 1.9c-.5.2-.7.6-.7 1.1v.4M10 14v.1" />
    </svg>
  ),
  estate: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8.8" cy="8.8" r="5.3" /><path d="M12.6 12.6 17 17" />
    </svg>
  ),
  library: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 4.5h4a2 2 0 0 1 2 2v9a1.6 1.6 0 0 0-1.6-1.6H3.5zM16.5 4.5h-4a2 2 0 0 0-2 2v9a1.6 1.6 0 0 1 1.6-1.6h4.4z" />
    </svg>
  ),
  setup: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" />
    </svg>
  ),
};

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  view: string;
  onSelect: (view: string) => void;
}

export default function Sidebar({ collapsed, onToggle, view, onSelect }: Props) {
  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-head">
        <div className="mark" aria-hidden="true">
          Ω
        </div>
        <div className="wordmark">
          Content Studio
          <span>Omega Financial</span>
        </div>
        <button
          className="collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            {collapsed ? (
              <path d="M7 4.5 12.5 10 7 15.5" />
            ) : (
              <path d="M13 4.5 7.5 10 13 15.5" />
            )}
          </svg>
        </button>
      </div>

      <nav className="nav">
        <div className="nav-label">Write for</div>
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            className={view === c.id ? "nav-item active" : "nav-item"}
            onClick={() => onSelect(c.id)}
            title={collapsed ? c.name : undefined}
          >
            <span className="nav-icon">{ICONS[c.id]}</span>
            <span className="nav-text">
              <b>{c.name}</b>
              <i>{c.blurb}</i>
            </span>
          </button>
        ))}

        <div className="nav-label">Craft</div>
        <button
          className={view === "interview" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("interview")}
          title={collapsed ? "Advisor interview" : undefined}
        >
          <span className="nav-icon">{ICONS.interview}</span>
          <span className="nav-text"><b>Advisor interview</b><i>What they actually know</i></span>
        </button>
        <button
          className={view === "voice" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("voice")}
          title={collapsed ? "Voice bank" : undefined}
        >
          <span className="nav-icon">{ICONS.voice}</span>
          <span className="nav-text"><b>Voice bank</b><i>Exemplars and questions</i></span>
        </button>

        <div className="nav-label">Manage</div>
        <button
          className={view === "campaigns" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("campaigns")}
          title={collapsed ? "Campaigns" : undefined}
        >
          <span className="nav-icon">{ICONS.campaigns}</span>
          <span className="nav-text"><b>Campaigns</b><i>One brief, whole set</i></span>
        </button>
        <button
          className={view === "queue" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("queue")}
          title={collapsed ? "Review queue" : undefined}
        >
          <span className="nav-icon">{ICONS.queue}</span>
          <span className="nav-text"><b>Review queue</b><i>Worst risk first</i></span>
        </button>

        <div className="nav-label">Reference</div>
        <button
          className={view === "facts" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("facts")}
          title={collapsed ? "Fact base" : undefined}
        >
          <span className="nav-icon">{ICONS.facts}</span>
          <span className="nav-text">
            <b>Fact base</b>
            <i>What may be claimed</i>
          </span>
        </button>
        <button
          className={view === "library" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("library")}
          title={collapsed ? "Library" : undefined}
        >
          <span className="nav-icon">{ICONS.library}</span>
          <span className="nav-text">
            <b>Library</b>
            <i>What the tool has learned</i>
          </span>
        </button>
        <button
          className={view === "knowledge" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("knowledge")}
          title={collapsed ? "Profession knowledge" : undefined}
        >
          <span className="nav-icon">{ICONS.knowledge}</span>
          <span className="nav-text"><b>Profession knowledge</b><i>The client&apos;s world</i></span>
        </button>
        <button
          className={view === "estate" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("estate")}
          title={collapsed ? "Estate sweep" : undefined}
        >
          <span className="nav-icon">{ICONS.estate}</span>
          <span className="nav-text"><b>Estate sweep</b><i>Scan what is live</i></span>
        </button>
        <button
          className={view === "setup" ? "nav-item active" : "nav-item"}
          onClick={() => onSelect("setup")}
          title={collapsed ? "Setup" : undefined}
        >
          <span className="nav-icon">{ICONS.setup}</span>
          <span className="nav-text">
            <b>Setup</b>
            <i>Keys and deployment</i>
          </span>
        </button>
      </nav>

      <div className="sidebar-foot">
        <p>
          Every draft needs a human sign-off before it ships. Nothing here is
          compliance approval.
        </p>
      </div>
    </aside>
  );
}
