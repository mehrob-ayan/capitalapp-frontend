import type { CategorySlice } from '../api'
import { money } from '../format'

// Palette for category segments — distinct, readable in light and dark.
export const DONUT_COLORS = [
  '#2F8F7E', '#B5793A', '#C6A254', '#3E8C79', '#7FB39C',
  '#8E6FB0', '#C7695A', '#5E8CA0', '#CDA434', '#9AA0A6',
]

export function colorFor(index: number): string {
  return DONUT_COLORS[index % DONUT_COLORS.length]
}

export function Donut({ slices, total, currency }: { slices: CategorySlice[]; total: number; currency: string }) {
  const size = 180
  const r = 70
  const cx = size / 2
  const cy = size / 2
  const c = 2 * Math.PI * r
  const stroke = 26

  let offset = 0
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-2)" strokeWidth={stroke} />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.percent / 100) * c
            const el = (
              <circle
                key={s.category}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={colorFor(i)}
                strokeWidth={stroke}
                strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
                strokeDashoffset={(-offset).toFixed(2)}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            )
            offset += len
            return el
          })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="donut-total">{money(total, currency)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="donut-cap">расход за месяц</text>
      </svg>
    </div>
  )
}
