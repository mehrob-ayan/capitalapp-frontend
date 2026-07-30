import { useEffect, useState } from 'react'
import {
  getHistory, getComposition, getGoals, getRates, patchSnapshot, deleteSnapshot, setSnapshotNote,
  type History, type Composition,
} from '../api'
import { CURRENCIES, KIND_META, kindColor } from '../kinds'
import { money, signedMoney, percent, dateShort } from '../format'
import { AreaChart } from '../components/AreaChart'
import { LinesChart } from '../components/LinesChart'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'

const PERIODS: [string, string][] = [
  ['1m', '1М'],
  ['6m', '6М'],
  ['1y', '1Г'],
  ['all', 'Всё'],
]

function kindLabel(k: string): string {
  if (k === 'options') return 'Опционы'
  return (KIND_META as Record<string, { label: string }>)[k]?.label ?? k
}

export function HistoryScreen({ baseCurrency, onChangeCurrency }: { baseCurrency: string; onChangeCurrency: (c: string) => void }) {
  const [period, setPeriod] = useState('1y')
  const [data, setData] = useState<History | null>(null)
  const [comp, setComp] = useState<Composition | null>(null)
  const [goalBase, setGoalBase] = useState<number | undefined>(undefined)
  const [edit, setEdit] = useState<{ date: string; value: number; note: string } | null>(null)

  const reload = () => {
    void getHistory(period).then(setData)
    void getComposition(period).then(setComp)
  }
  useEffect(reload, [period, baseCurrency])

  // Goal line: convert the first goal's target into the base currency.
  useEffect(() => {
    void Promise.all([getGoals(), getRates()]).then(([goals, rates]) => {
      if (!goals.length) return setGoalBase(undefined)
      const g = goals[0]
      const from = rates[g.currency] ?? 0
      const to = rates[baseCurrency] ?? 0
      setGoalBase(from > 0 && to > 0 ? (g.targetAmount * from) / to : undefined)
    })
  }, [baseCurrency])

  return (
    <div className="pad-screen">
      <div className="topbar">Динамика</div>

      <div className="ccy" role="group" aria-label="Валюта капитала">
        {CURRENCIES.map((c) => (
          <button key={c} className={c === baseCurrency ? 'on' : ''} onClick={() => onChangeCurrency(c)}>{c}</button>
        ))}
      </div>

      {!data && <p className="muted">Загрузка…</p>}
      {data && (
        <>
          <div className="eyebrow">Капитал сейчас</div>
          <div className="hero small">{money(data.current, data.baseCurrency)}</div>
          <div className={`delta ${data.changeAbs >= 0 ? 'pos' : 'neg'}`}>
            {data.changeAbs >= 0 ? '▲' : '▼'} {signedMoney(data.changeAbs, data.baseCurrency)} · {percent(data.changePercent)} за период
          </div>

          <div className="seg period">
            {PERIODS.map(([value, label]) => (
              <button key={value} type="button" className={value === period ? 'on' : ''} onClick={() => setPeriod(value)}>{label}</button>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-title">Чистый капитал{goalBase ? ' · с целью' : ''}</div>
            <AreaChart values={data.points.map((p) => p.netWorth)} goal={goalBase} />
          </div>

          {(() => {
            const last = data.points[data.points.length - 1]
            return (
              <div className="exp-totals">
                <div><span className="k">Активы</span><span className="v pos">{money(last?.assets ?? 0, data.baseCurrency)}</span></div>
                <div><span className="k">Обязательства</span><span className="v neg">{money(last?.liabilities ?? 0, data.baseCurrency)}</span></div>
                <div><span className="k">Проценты/день</span><span className={`v ${data.dailyInterest > 0 ? 'neg' : ''}`}>{data.dailyInterest > 0 ? signedMoney(-data.dailyInterest, data.baseCurrency) : '—'}</span></div>
              </div>
            )
          })()}

          <div className="chart-card">
            <div className="chart-title">Активы и обязательства</div>
            <LinesChart
              series={[
                { color: 'var(--pos)', values: data.points.map((p) => p.assets) },
                { color: 'var(--neg)', values: data.points.map((p) => p.liabilities) },
              ]}
            />
            <div className="clegend" style={{ marginTop: 8 }}>
              <div><i style={{ background: 'var(--pos)' }} />Активы</div>
              <div><i style={{ background: 'var(--neg)' }} />Обязательства</div>
            </div>
          </div>

          {comp && comp.points.length >= 2 && comp.kinds.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Состав капитала по месяцам</div>
              <StackedBars comp={comp} />
              <div className="clegend" style={{ marginTop: 8 }}>
                {comp.kinds.map((k) => (
                  <div key={k}><i style={{ background: kindColor(k) }} />{kindLabel(k)}</div>
                ))}
              </div>
            </div>
          )}

          <label className="section-lbl">Снимки капитала <span className="hint">· нажми, чтобы добавить заметку</span></label>
          <div className="list history-list">
            {[...data.points].reverse().map((p) => (
              <button className="li" key={p.date} onClick={() => setEdit({ date: p.date, value: Math.round(p.netWorth), note: p.note ?? '' })}>
                <span className="li-main">
                  <span className="li-name">{dateShort(p.date)}{p.note ? ' 📝' : ''}</span>
                  <span className="li-sub">{p.note || 'снимок капитала'}</span>
                </span>
                <span className="li-amt"><span className="li-a">{money(p.netWorth, data.baseCurrency)}</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {edit && data && (
        <SnapshotSheet
          date={edit.date}
          initial={edit.value}
          initialNote={edit.note}
          currency={data.baseCurrency}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); reload() }}
        />
      )}
    </div>
  )
}

// 100%-stacked bars: each day is a full-height column split by kind share.
function StackedBars({ comp }: { comp: Composition }) {
  const W = 300
  const H = 90
  const n = comp.points.length
  const gap = 3
  const bw = (W - gap * (n - 1)) / n
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Состав капитала по месяцам">
      {comp.points.map((pt, i) => {
        const total = comp.kinds.reduce((s, k) => s + (pt.parts[k] ?? 0), 0) || 1
        let yTop = 0
        const x = i * (bw + gap)
        return comp.kinds.map((k) => {
          const v = pt.parts[k] ?? 0
          if (v <= 0) return null
          const h = (v / total) * H
          const rect = <rect key={`${i}-${k}`} x={x.toFixed(1)} y={yTop.toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} fill={kindColor(k)} />
          yTop += h
          return rect
        })
      })}
    </svg>
  )
}

export function SnapshotSheet({
  date, initial, initialNote, currency, onClose, onSaved,
}: {
  date: string
  initial: number
  initialNote: string
  currency: string
  onClose: () => void
  onSaved: () => void
}) {
  const [val, setVal] = useState(String(initial))
  const [note, setNote] = useState(initialNote)
  const [busy, setBusy] = useState(false)

  async function save() {
    const n = parseFloat(val)
    setBusy(true)
    try {
      // Only override capital when the number actually changed — otherwise a
      // plain note edit would flatten the day's assets/liabilities breakdown.
      if (Number.isFinite(n) && n !== initial) await patchSnapshot(date, n)
      if (note.trim() !== initialNote.trim()) await setSnapshotNote(date, note)
      onSaved()
    } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Удалить этот снимок из истории?')) return
    setBusy(true)
    try { await deleteSnapshot(date); onSaved() } finally { setBusy(false) }
  }

  return (
    <Sheet title="Снимок капитала" subtitle={dateShort(date)} onClose={onClose}>
      <div className="fld">
        <label>Заметка</label>
        <textarea
          className="inp"
          rows={2}
          placeholder="Напр. добавил долг, продал машину…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="fld">
        <label>Капитал в этот день ({currency})</label>
        <div className="inp-wrap">
          <MoneyInput className="inp big" value={val} onChange={setVal} />
        </div>
      </div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
      <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить снимок</button>
    </Sheet>
  )
}
