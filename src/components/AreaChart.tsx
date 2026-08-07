// Small dependency-free area chart. Scales a series of values into a fixed
// viewBox; the SVG then scales uniformly to the container width.
export function AreaChart({ values, goal }: { values: number[]; goal?: number }) {
  if (values.length < 2) {
    return <div className="chart-empty">Пока одна точка. График появится, когда накопится история за несколько дней.</div>
  }

  const W = 300
  const H = 120
  const pad = 8
  // Scale to the data only — a far-off goal (e.g. $1M vs $117k now) must not
  // stretch the axis and flatten the real curve. The goal line is clamped in.
  const showGoal = typeof goal === 'number' && goal > 0
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const headroom = (dataMax - dataMin) * 0.15 || Math.abs(dataMax) * 0.05 || 1
  const min = dataMin - headroom
  const max = dataMax + headroom
  const span = max - min || 1
  const stepX = (W - pad * 2) / (values.length - 1)
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2)

  const pts = values.map((v, i) => [pad + i * stepX, y(v)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  const last = pts[pts.length - 1]
  const goalY = showGoal ? Math.max(pad, Math.min(H - pad, y(goal as number))) : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="График капитала">
      <defs>
        <linearGradient id="chFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.26" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chFill)" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {showGoal && (
        <>
          <line x1={pad} y1={goalY} x2={W - pad} y2={goalY} stroke="var(--gold)" strokeWidth="1.2" strokeDasharray="4 4" />
          <text x={pad + 2} y={Math.max(goalY - 3, 9)} fontSize="9" fill="var(--gold)">цель</text>
        </>
      )}
      <circle cx={last[0]} cy={last[1]} r="4" fill="var(--gold)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  )
}
