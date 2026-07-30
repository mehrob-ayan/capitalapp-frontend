import { useEffect, useMemo, useState } from 'react'
import { getHistory, getComposition, getGoals, getRates, type History, type Composition } from '../../api'
import { KIND_META, kindColor } from '../../kinds'
import { money, signedMoney, dateShort } from '../../format'
import { CapitalChart, LinesChart, StackedMonths, signedPct } from './shared'
import { SnapshotSheet } from '../HistoryScreen'

const PERIODS: [string, string][] = [['1m', '1М'], ['6m', '6М'], ['1y', '1Г'], ['all', 'Всё']]

function kindLabel(k: string): string {
  if (k === 'options') return 'Опционы'
  return (KIND_META as Record<string, { label: string }>)[k]?.label ?? k
}

// Best calendar month by net-worth gain, from the loaded points.
function bestMonth(points: History['points'], base: string): string {
  const byMonth = new Map<string, number>()
  for (const p of points) byMonth.set(p.date.slice(0, 7), p.netWorth) // last point wins
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  let best = -Infinity
  let bestM = ''
  for (let i = 1; i < months.length; i++) {
    const gain = months[i][1] - months[i - 1][1]
    if (gain > best) { best = gain; bestM = months[i][0] }
  }
  if (!bestM || best <= 0) return '—'
  const [y, m] = bestM.split('-')
  return `+${money(best, base)} · ${['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][+m - 1]} ${y}`
}

export function DesktopHistory({ base }: { base: string }) {
  const [period, setPeriod] = useState('1y')
  const [data, setData] = useState<History | null>(null)
  const [comp, setComp] = useState<Composition | null>(null)
  const [goalBase, setGoalBase] = useState<number | undefined>(undefined)
  const [edit, setEdit] = useState<{ date: string; value: number; note: string } | null>(null)

  const reload = () => {
    void getHistory(period).then(setData)
    void getComposition(period).then(setComp)
  }
  useEffect(reload, [period, base])
  useEffect(() => {
    void Promise.all([getGoals(), getRates()]).then(([goals, rates]) => {
      if (!goals.length) return setGoalBase(undefined)
      const g = goals[0]
      const from = rates[g.currency] ?? 0
      const to = rates[base] ?? 0
      setGoalBase(from > 0 && to > 0 ? (g.targetAmount * from) / to : undefined)
    })
  }, [base])

  const last = data?.points[data.points.length - 1]
  const rows = useMemo(() => (data ? [...data.points].reverse() : []), [data])

  return (
    <div className="dt-grid c-rail">
      <div className="dt-main-col dt-scrollcol">
        <section className="dt-card dt-cap">
          <div className="dt-cap-top">
            <div className="dt-cap-l">
              <div className="eyebrow">Капитал сейчас</div>
              <div className="dt-cap-hero sm">{money(data?.current ?? 0, base)}</div>
              {data && (
                <div className={`dt-cap-delta ${data.changeAbs >= 0 ? 'pos' : 'neg'}`}>
                  {data.changeAbs >= 0 ? '▲' : '▼'} {signedMoney(data.changeAbs, base)} · {signedPct(data.changePercent)}
                  <span className="dt-cap-per"> за период</span>
                </div>
              )}
            </div>
            <div className="dt-cap-r">
              <div className="dt-chips">
                {PERIODS.map(([v, l]) => <button key={v} className={v === period ? 'on' : ''} onClick={() => setPeriod(v)}>{l}</button>)}
              </div>
              <CapitalChart points={data?.points ?? []} goal={goalBase} viewH={200} />
            </div>
          </div>
        </section>

        <section className="dt-card dt-pad">
          <div className="dt-card-head">
            <span className="dt-card-ttl">Активы и обязательства</span>
            <div className="clegend">
              <div><i style={{ background: 'var(--pos)' }} />Активы</div>
              <div><i style={{ background: 'var(--neg)' }} />Обязательства</div>
            </div>
          </div>
          <LinesChart series={[
            { color: 'var(--pos)', values: (data?.points ?? []).map((p) => p.assets) },
            { color: 'var(--neg)', values: (data?.points ?? []).map((p) => p.liabilities) },
          ]} />
        </section>

        {comp && comp.points.length >= 2 && comp.kinds.length > 0 && (
          <section className="dt-card dt-pad">
            <div className="dt-card-head"><span className="dt-card-ttl">Состав капитала по месяцам</span></div>
            <StackedMonths comp={comp} />
            <div className="clegend" style={{ marginTop: 10 }}>
              {comp.kinds.map((k) => <div key={k}><i style={{ background: kindColor(k) }} />{kindLabel(k)}</div>)}
            </div>
          </section>
        )}
      </div>

      <div className="dt-rail">
        <section className="dt-card dt-rc">
          <div className="dt-rc-head"><span>Итоги периода</span></div>
          <div className="dt-kv"><span>Активы</span><b className="pos">{money(last?.assets ?? 0, base)}</b></div>
          <div className="dt-kv"><span>Обязательства</span><b className="neg">{money(last?.liabilities ?? 0, base)}</b></div>
          <div className="dt-kv"><span>Проценты/день</span><b className={data && data.dailyInterest > 0 ? 'neg' : ''}>{data && data.dailyInterest > 0 ? `−${money(data.dailyInterest, base)}` : '—'}</b></div>
          <div className="dt-kv"><span>Лучший месяц</span><b>{data ? bestMonth(data.points, base) : '—'}</b></div>
        </section>

        <section className="dt-card dt-rc dt-act">
          <div className="dt-rc-head"><span>Снимки капитала</span><span className="dt-hint">клик — заметка</span></div>
          <div className="dt-feed">
            {rows.map((p) => (
              <button key={p.date} className="dt-snap" onClick={() => setEdit({ date: p.date, value: Math.round(p.netWorth), note: p.note ?? '' })}>
                <span className="dt-snap-main">
                  <span className="dt-snap-d">{dateShort(p.date)}{p.note ? ' 📝' : ''}</span>
                  <span className="dt-snap-n">{p.note || 'снимок капитала'}</span>
                </span>
                <span className="dt-snap-a">{money(p.netWorth, base)}</span>
              </button>
            ))}
            {rows.length === 0 && <p className="muted dt-rc-empty">Пока нет снимков.</p>}
          </div>
        </section>
      </div>

      {edit && (
        <SnapshotSheet date={edit.date} initial={edit.value} initialNote={edit.note} currency={base}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />
      )}
    </div>
  )
}
