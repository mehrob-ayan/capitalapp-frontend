// Multi-series line chart on a shared scale (dependency-free). All series must
// share the same x length; the y-range spans every series.
export function LinesChart({ series }: { series: { color: string; values: number[] }[] }) {
  const n = series[0]?.values.length ?? 0
  if (n < 2) {
    return <div className="chart-empty">Пока мало точек — линии появятся за несколько дней.</div>
  }
  const W = 300
  const H = 120
  const pad = 8
  const all = series.flatMap((s) => s.values)
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const stepX = (W - pad * 2) / (n - 1)
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2)
  const path = (vals: number[]) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${(pad + i * stepX).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Активы и обязательства">
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line)" strokeWidth="1" />
      {series.map((s, i) => (
        <path key={i} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  )
}
