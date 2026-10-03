interface Step { label: string; complete: boolean }

export default function BriefProgress({ steps }: { steps: Step[] }) {
  const complete = steps.filter((step) => step.complete).length;
  const next = steps.find((step) => !step.complete);
  return (
    <section className="brief-progress" aria-label="Brief progress">
      <div className="brief-progress-head">
        <div><strong>Content brief</strong><span>{complete} of {steps.length} ready</span></div>
        <span className="hint">{next ? `Next: ${next.label}` : "Ready to write"}</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(complete / steps.length) * 100}%` }} /></div>
      <div className="brief-steps">{steps.map((step) => <span key={step.label} className={step.complete ? "brief-step complete" : "brief-step"}>{step.complete ? "✓" : "○"} {step.label}</span>)}</div>
    </section>
  );
}
