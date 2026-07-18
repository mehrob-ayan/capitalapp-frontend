// Circular progress ring, clamped to 0–100 for the arc but showing the true
// percentage in the centre.
export function Ring({ percent }: { percent: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = c * (1 - clamped / 100)
  return (
    <svg className="ring" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--card-2)" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke="var(--gold)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c.toFixed(1)} strokeDashoffset={offset.toFixed(1)} transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" className="ring-t">{Math.round(percent)}%</text>
    </svg>
  )
}
