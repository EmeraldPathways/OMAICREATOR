interface EvidencePanelProps {
  learned: { exemplars: number; facts: number; lessons: number; expired: { claim: string }[] } | null;
  sources: { title: string; url: string }[];
}

export default function EvidencePanel({ learned, sources }: EvidencePanelProps) {
  if (!learned && !sources.length) return null;
  return <div className="evidence-panel" aria-label="Evidence used for this draft">
    <div><strong>Evidence used</strong><span>Traceable inputs for review</span></div>
    <div className="evidence-stats"><span><b>{learned?.facts || 0}</b> verified figures</span><span><b>{learned?.exemplars || 0}</b> approved examples</span><span><b>{learned?.lessons || 0}</b> learned corrections</span></div>
    {learned?.expired?.length ? <p className="evidence-warning">{learned.expired.length} source item{learned.expired.length === 1 ? "" : "s"} need review before relying on them.</p> : null}
    {sources.length ? <div className="evidence-sources">{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div> : <p className="evidence-muted">No live Irish sources selected for this draft.</p>}
  </div>;
}
