// Shared desktop-only chart primitives and formatters. All colours come from
// CSS variables so light/dark themes work automatically.
import type { History, Composition, EffMonth, MonthTrend } from '../../api'
import { kindColor } from '../../kinds'
import { dateShort } from '../../format'

export const nf1 = (n: number) => (Math.round(Math.abs(n) * 10) / 10).toString().replace('.', ',')
export const signedPct = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${nf1(p)}%`
export const compactDate = (iso: string) => dateShort(iso).split(' ').slice(0, 2).join(' ')

export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function activityDot(kind: string): string {
  if (kind === 'salary' || kind === 'income' || kind === 'lent_repayment') return 'var(--pos)'
  if (kind === 'rate_changed') return 'var(--gold)'
  if (kind === 'interest' || kind === 'debt_interest' || kind === 'debt_payment') return 'var(--neg)'
  if (kind.startsWith('option')) return '#7A6FF0'
  return 'var(--muted)'
}

// Progress ring (r=30) whose arc length is driven by the same percent as the
// centre label. Used on Overview, Goals.
export function GoalRing({ percent, size = 68 }: { percent: number; size?: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <svg className="dt-ring" viewBox="0 0 72 72" width={size} height={size}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--brand)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${((clamped / 100) * c).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 36 36)" />
      <text x="36" y="40" textAnchor="middle" className="dt-ring-t">{Math.round(percent)}%</text>
    </svg>
  )
}

// Big ring for the Efficiency header (r=40).
export function BigRing({ percent }: { percent: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <svg viewBox="0 0 104 104" width="104" height="104" className="dt-ring">
      <circle cx="52" cy="52" r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
      <circle cx="52" cy="52" r={r} fill="none" stroke="var(--brand)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${((clamped / 100) * c).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 52 52)" />
      <text x="52" y="58" textAnchor="middle" className="dt-ring-t" style={{ fontSize: 19 }}>{Math.round(percent)}%</text>
    </svg>
  )
}

// Capital area chart: fixed gridlines, brand gradient fill + curve, dashed goal
// line, gold end dot, and a 5-stop date axis below.
export function CapitalChart({ points, goal, viewH = 168 }: { points: History['points']; goal?: number; viewH?: number }) {
  if (points.length < 2) {
    return <div className="dt-chart-empty">График появится, когда накопится история за несколько дней.</div>
  }
  const W = 620
  const padY = 16
  const values = points.map((p) => p.netWorth)
  const showGoal = typeof goal === 'number' && goal > 0
  // Scale to the capital data only — a far-off goal must NOT stretch the axis and
  // flatten the real curve. The goal line is clamped into view instead.
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const pad = (dataMax - dataMin) * 0.15 || Math.abs(dataMax) * 0.05 || 1
  const min = dataMin - pad
  const max = dataMax + pad
  const span = max - min || 1
  const n = values.length
  const stepX = W / (n - 1)
  const y = (v: number) => padY + (viewH - 2 * padY) * (1 - (v - min) / span)
  const pts = values.map((v, i) => [i * stepX, y(v)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${W},${viewH} L0,${viewH} Z`
  const last = pts[pts.length - 1]
  const goalY = showGoal ? Math.max(3, Math.min(viewH - 3, y(goal as number))) : 0
  const grid = [0.25, 0.5, 0.75].map((f) => Math.round(f * viewH))
  const axisIdx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)))

  return (
    <div className="dt-chart">
      <svg viewBox={`0 0 ${W} ${viewH}`} preserveAspectRatio="none" className="dt-chart-svg" style={{ height: viewH + 42 }} role="img" aria-label="График капитала">
        <defs>
          <linearGradient id="dtFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.24" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((gy) => <line key={gy} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        <path d={area} fill="url(#dtFill)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {showGoal && <line x1="0" y1={goalY} x2={W} y2={goalY} stroke="var(--gold)" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--gold)" stroke="var(--card)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="dt-chart-axis">
        {axisIdx.map((i, k) => <span key={k}>{k === axisIdx.length - 1 ? 'сегодня' : compactDate(points[i].date)}</span>)}
      </div>
    </div>
  )
}

// Two overlaid line series (assets / liabilities) on one scale.
export function LinesChart({ series, viewH = 130 }: { series: { color: string; values: number[] }[]; viewH?: number }) {
  const all = series.flatMap((s) => s.values)
  if (all.length < 2) return <div className="dt-chart-empty">Мало данных для графика.</div>
  const W = 620
  const padY = 12
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const grid = [0.33, 0.66].map((f) => Math.round(f * viewH))
  return (
    <svg viewBox={`0 0 ${W} ${viewH}`} preserveAspectRatio="none" className="dt-chart-svg" style={{ height: viewH }} role="img">
      {grid.map((gy) => <line key={gy} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      {series.map((s, si) => {
        const n = s.values.length
        const stepX = W / Math.max(1, n - 1)
        const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)},${(padY + (viewH - 2 * padY) * (1 - (v - min) / span)).toFixed(1)}`).join(' ')
        return <path key={si} d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      })}
    </svg>
  )
}

// 100%-stacked monthly composition bars.
export function StackedMonths({ comp, viewH = 120 }: { comp: Composition; viewH?: number }) {
  const W = 620
  const n = comp.points.length
  const gap = 8
  const bw = Math.min(44, (W - gap * (n - 1)) / Math.max(1, n))
  return (
    <svg viewBox={`0 0 ${W} ${viewH}`} className="dt-chart-svg" style={{ height: viewH }} role="img" aria-label="Состав капитала по месяцам">
      {comp.points.map((pt, i) => {
        const total = comp.kinds.reduce((s, k) => s + (pt.parts[k] ?? 0), 0) || 1
        let yTop = 0
        const x = i * (bw + gap)
        return comp.kinds.map((k) => {
          const v = pt.parts[k] ?? 0
          if (v <= 0) return null
          const h = (v / total) * viewH
          const rect = <rect key={`${i}-${k}`} x={x.toFixed(1)} y={yTop.toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} fill={kindColor(k)} />
          yTop += h
          return rect
        })
      })}
    </svg>
  )
}

// Signed monthly bars (capital added), green up / red down.
export function MonthBars({ trend }: { trend: EffMonth[] }) {
  const W = 620
  const H = 190
  const base = 150
  const max = Math.max(1, ...trend.map((t) => Math.abs(t.growth)))
  const n = trend.length
  const slot = W / Math.max(1, n)
  const bw = Math.min(52, slot * 0.6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dt-chart-svg" style={{ height: H }} role="img" aria-label="В капитал по месяцам">
      <line x1="0" y1={base} x2={W} y2={base} stroke="var(--line)" strokeWidth="1" />
      {trend.map((t, i) => {
        const cx = i * slot + slot / 2
        const h = (Math.abs(t.growth) / max) * (base - 20)
        const up = t.growth >= 0
        return (
          <g key={t.month}>
            <rect x={(cx - bw / 2).toFixed(1)} y={(up ? base - h : base).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} rx="4" fill={up ? 'var(--pos)' : 'var(--neg)'} />
            <text x={cx.toFixed(1)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">{t.month.slice(5)}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Paired income/expense bars per month.
export function TrendBars({ trend }: { trend: MonthTrend[] }) {
  const W = 620
  const H = 108
  const base = 90
  const max = Math.max(1, ...trend.map((t) => Math.max(t.income, t.expense)))
  const n = trend.length
  const slot = W / Math.max(1, n)
  const bw = 18
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dt-chart-svg" style={{ height: H }} role="img" aria-label="Доход и расход по месяцам">
      {trend.map((t, i) => {
        const cx = i * slot + slot / 2
        const ih = (t.income / max) * (base - 8)
        const eh = (t.expense / max) * (base - 8)
        return (
          <g key={t.month}>
            <rect x={(cx - bw - 2).toFixed(1)} y={(base - ih).toFixed(1)} width={bw} height={ih.toFixed(1)} rx="2" fill="var(--pos)" />
            <rect x={(cx + 2).toFixed(1)} y={(base - eh).toFixed(1)} width={bw} height={eh.toFixed(1)} rx="2" fill="var(--neg)" />
            <text x={cx.toFixed(1)} y={H - 4} fontSize="9" textAnchor="middle" fill="var(--muted)">{t.month.slice(5)}</text>
          </g>
        )
      })}
    </svg>
  )
}
