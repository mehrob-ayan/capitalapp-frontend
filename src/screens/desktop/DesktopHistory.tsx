import { useEffect, useMemo, useState } from 'react'
import { getHistory, getComposition, getFlow, getDebtChanges, getAssetChanges, getGoals, getRates, type History, type Composition, type Flow, type DebtChanges, type AssetChanges, type HistoryPoint, type EffMonth } from '../../api'
import { KIND_META, kindColor } from '../../kinds'
import { money, signedMoney, dateShort } from '../../format'
import { CapitalChart, LinesChart, MonthBars, StackedMonths, signedPct } from './shared'
import { SnapshotSheet } from '../HistoryScreen'
import { pendingMetric, METRIC_LABEL, type HistMetric } from '../../historyMetric'

const PERIODS: [string, string][] = [['1m', '1М'], ['6m', '6М'], ['1y', '1Г'], ['all', 'Всё']]
const METRICS: HistMetric[] = ['capital', 'assets', 'liabilities', 'interest', 'flow']

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const monthLabel = (m: string) => { const [y, mm] = m.split('-'); return `${MONTHS[+mm - 1]} ${y}` }

function kindLabel(k: string): string {
  if (k === 'options') return 'Опционы'
  return (KIND_META as Record<string, { label: string }>)[k]?.label ?? k
}

// The value a day-based metric reads off a snapshot point.
function pointVal(p: HistoryPoint, m: HistMetric): number {
  if (m === 'assets') return p.assets
  if (m === 'liabilities') return p.liabilities
  if (m === 'interest') return p.interest
  return p.netWorth
}

const metricColor = (m: HistMetric) =>
  m === 'assets' ? 'var(--pos)' : m === 'liabilities' || m === 'interest' ? 'var(--neg)' : 'var(--brand)'

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
  return `+${money(best, base)} · ${monthLabel(bestM)}`
}

export function DesktopHistory({ base }: { base: string }) {
  const [period, setPeriod] = useState('1y')
  const [metric, setMetric] = useState<HistMetric>(() => {
    const p = pendingMetric.key; pendingMetric.key = null
    if (p) return p
    try { return (localStorage.getItem('capdyn.metric') as HistMetric | null) ?? 'capital' } catch { return 'capital' }
  })
  useEffect(() => { try { localStorage.setItem('capdyn.metric', metric) } catch { /* ignore */ } }, [metric])
  const [data, setData] = useState<History | null>(null)
  const [flow, setFlow] = useState<Flow | null>(null)
  const [debtChanges, setDebtChanges] = useState<DebtChanges | null>(null)
  const [assetChanges, setAssetChanges] = useState<AssetChanges | null>(null)
  const [comp, setComp] = useState<Composition | null>(null)
  const [goalBase, setGoalBase] = useState<number | undefined>(undefined)
  const [edit, setEdit] = useState<{ date: string; value: number; note: string; noteOnly: boolean } | null>(null)

  const reload = () => {
    void getHistory(period).then(setData)
    void getFlow(period).then(setFlow)
    void getDebtChanges(period).then(setDebtChanges)
    void getAssetChanges(period).then(setAssetChanges)
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

  const points = data?.points ?? []
  const last = points[points.length - 1]
  const first = points[0]
  const isFlow = metric === 'flow'
  const isInterest = metric === 'interest'

  // Headline value + change for the active metric.
  const current = isFlow
    ? (flow?.points[flow.points.length - 1]?.net ?? 0)
    : last ? pointVal(last, metric) : 0
  const changeAbs = isFlow || !last || !first ? 0 : pointVal(last, metric) - pointVal(first, metric)
  const changePct = first && pointVal(first, metric) !== 0 ? (changeAbs / Math.abs(pointVal(first, metric))) * 100 : 0

  const heroValue = isInterest
    ? (current > 0 ? `−${money(current, base)}/дн` : '—')
    : isFlow ? signedMoney(current, base) : money(current, base)

  const dayRows = useMemo(() => (data ? [...data.points].reverse() : []), [data])
  const flowRows = useMemo(() => (flow ? [...flow.points].reverse() : []), [flow])

  // Reuse the signed monthly bar chart for cash flow (net per month).
  const flowTrend: EffMonth[] = (flow?.points ?? []).map((p) => ({ month: p.month, growth: p.net, share: 0, capShare: 0 }))

  return (
    <div className="dt-grid c-rail">
      <div className="dt-main-col dt-scrollcol">
        <section className="dt-card dt-cap">
          <div className="dt-metric-tabs">
            {METRICS.map((m) => (
              <button key={m} className={m === metric ? 'on' : ''} onClick={() => setMetric(m)}>{METRIC_LABEL[m]}</button>
            ))}
          </div>
          <div className="dt-cap-top">
            <div className="dt-cap-l">
              <div className="eyebrow">{METRIC_LABEL[metric]}{isFlow ? ' · последний месяц' : ' сейчас'}</div>
              <div className={`dt-cap-hero sm ${metric === 'liabilities' || isInterest ? 'neg' : ''}`}>{heroValue}</div>
              {!isFlow && last && first && metric !== 'interest' && (
                <div className={`dt-cap-delta ${changeAbs >= 0 ? 'pos' : 'neg'}`}>
                  {changeAbs >= 0 ? '▲' : '▼'} {signedMoney(changeAbs, base)} · {signedPct(changePct)}
                  <span className="dt-cap-per"> за период</span>
                </div>
              )}
              {isInterest && <div className="dt-cap-per">сколько долги съедают в день</div>}
              {isFlow && <div className="dt-cap-per">доход − платежи по кредитам за месяц</div>}
            </div>
            <div className="dt-cap-r">
              <div className="dt-chips">
                {PERIODS.map(([v, l]) => <button key={v} className={v === period ? 'on' : ''} onClick={() => setPeriod(v)}>{l}</button>)}
              </div>
              {metric === 'capital' && <CapitalChart points={points} goal={goalBase} viewH={200} currency={base} />}
              {(metric === 'assets' || metric === 'liabilities' || isInterest) && (
                points.length >= 2
                  ? <LinesChart series={[{ color: metricColor(metric), values: points.map((p) => pointVal(p, metric)) }]} viewH={200} dates={points.map((p) => p.date)} currency={base} />
                  : <div className="dt-chart-empty">График появится, когда накопится история за несколько дней.</div>
              )}
              {isFlow && (
                flowTrend.length > 0
                  ? <MonthBars trend={flowTrend} />
                  : <div className="dt-chart-empty">Пока нет движений по счетам.</div>
              )}
            </div>
          </div>
        </section>

        {metric === 'assets' && assetChanges && assetChanges.items.length > 0 && (
          <section className="dt-card dt-pad">
            <div className="dt-card-head">
              <span className="dt-card-ttl">Что изменилось за период</span>
              <span className="dt-hint">по категориям</span>
            </div>
            <div className="dt-thead dt-asset-grid">
              <span>Категория</span><span className="r">Было</span><span className="r">Стало</span><span className="r">Изменение</span>
            </div>
            <div className="dt-tbody">
              {assetChanges.items.map((it) => (
                <div key={it.kind} className="dt-trow dt-asset-grid static">
                  <span className="dt-tc-name">
                    <span className="dt-li-ic" style={{ background: kindColor(it.kind) }}>{(kindLabel(it.kind)[0] || '·').toUpperCase()}</span>
                    <b>{kindLabel(it.kind)}</b>
                  </span>
                  <span className="r muted">{money(it.start, base)}</span>
                  <span className="r num">{money(it.now, base)}</span>
                  <span className={`r num ${it.delta > 0 ? 'pos' : it.delta < 0 ? 'neg' : 'muted'}`}>{it.delta === 0 ? '—' : `${it.delta > 0 ? '+' : '−'}${money(Math.abs(it.delta), base)}`}</span>
                </div>
              ))}
            </div>
            <div className="dt-kv" style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <span>Итого прирост активов</span><b className={assetChanges.totalDelta >= 0 ? 'pos' : 'neg'}>{assetChanges.totalDelta >= 0 ? '+' : '−'}{money(Math.abs(assetChanges.totalDelta), base)}</b>
            </div>
          </section>
        )}

        {metric === 'liabilities' && debtChanges && debtChanges.items.length > 0 && (
          <section className="dt-card dt-pad">
            <div className="dt-card-head">
              <span className="dt-card-ttl">Что изменилось за период</span>
              {debtChanges.items.some((i) => i.closed) && <span className="dt-hint">закрыто: {debtChanges.items.filter((i) => i.closed).length}</span>}
            </div>
            <div className="dt-thead dt-debt-grid">
              <span>Долг</span><span className="r">Выплачено</span><span className="r">Остаток</span><span />
            </div>
            <div className="dt-tbody">
              {debtChanges.items.map((it) => (
                <div key={it.name} className="dt-trow dt-debt-grid static">
                  <span className="dt-tc-name"><b>{it.name}</b><small>{it.payments} {it.payments === 1 ? 'платёж' : 'платежей'} · {it.currency}</small></span>
                  <span className="r num neg">−{money(it.paid, base)}</span>
                  <span className={`r num ${it.closed ? 'muted' : ''}`}>{it.closed ? '—' : money(it.outstanding, base)}</span>
                  <span className="r">{it.closed && <span className="dt-badge-closed">✓ закрыт</span>}</span>
                </div>
              ))}
            </div>
            <div className="dt-kv" style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <span>Всего выплачено за период</span><b className="neg">−{money(debtChanges.paidTotal, base)}</b>
            </div>
            <p className="note">Обязательства при этом упали меньше, чем выплачено: сверху капают проценты и добавляются новые долги.</p>
          </section>
        )}

        {metric === 'capital' && comp && comp.points.length >= 2 && comp.kinds.length > 0 && (
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
          <div className="dt-rc-head">
            <span>{isFlow ? 'Поток по месяцам' : 'Снимки'}</span>
            <span className="dt-hint">{isFlow ? 'доход − платежи' : metric === 'capital' ? 'клик — заметка' : 'значение по дням'}</span>
          </div>
          <div className="dt-feed">
            {!isFlow && dayRows.map((p) => {
              const v = pointVal(p, metric)
              const shown = isInterest ? (v > 0 ? `−${money(v, base)}/дн` : '—') : money(v, base)
              return (
                <button key={p.date} className="dt-snap" onClick={() => setEdit({ date: p.date, value: Math.round(p.netWorth), note: p.note ?? '', noteOnly: metric !== 'capital' })}>
                  <span className="dt-snap-main">
                    <span className="dt-snap-d">{dateShort(p.date)}{p.note ? ' 📝' : ''}</span>
                    <span className="dt-snap-n">{p.note || METRIC_LABEL[metric]}</span>
                  </span>
                  <span className={`dt-snap-a ${metric === 'liabilities' || isInterest ? 'neg' : ''}`}>{shown}</span>
                </button>
              )
            })}
            {isFlow && flowRows.map((p) => (
              <div key={p.month} className="dt-snap static">
                <span className="dt-snap-main">
                  <span className="dt-snap-d">{monthLabel(p.month)}</span>
                  <span className="dt-snap-n">доход {money(p.income, base)} · платежи {money(p.payments, base)}</span>
                </span>
                <span className={`dt-snap-a ${p.net >= 0 ? 'pos' : 'neg'}`}>{signedMoney(p.net, base)}</span>
              </div>
            ))}
            {!isFlow && dayRows.length === 0 && <p className="muted dt-rc-empty">Пока нет снимков.</p>}
            {isFlow && flowRows.length === 0 && <p className="muted dt-rc-empty">Пока нет движений.</p>}
          </div>
        </section>
      </div>

      {edit && (
        <SnapshotSheet date={edit.date} initial={edit.value} initialNote={edit.note} currency={base} noteOnly={edit.noteOnly}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />
      )}
    </div>
  )
}
