import { useEffect, useState } from 'react'
import { getHistory, type History } from '../api'
import { money, signedMoney, percent, dateShort } from '../format'
import { AreaChart } from '../components/AreaChart'
import { LinesChart } from '../components/LinesChart'

const PERIODS: [string, string][] = [
  ['1m', '1М'],
  ['6m', '6М'],
  ['1y', '1Г'],
  ['all', 'Всё'],
]

export function HistoryScreen() {
  const [period, setPeriod] = useState('1y')
  const [data, setData] = useState<History | null>(null)

  useEffect(() => {
    void getHistory(period).then(setData)
  }, [period])

  return (
    <div className="pad-screen">
      <div className="topbar">История</div>

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
              <button key={value} type="button" className={value === period ? 'on' : ''} onClick={() => setPeriod(value)}>
                {label}
              </button>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-title">Чистый капитал</div>
            <AreaChart values={data.points.map((p) => p.netWorth)} />
          </div>

          {(() => {
            const n = data.points.length
            const last = data.points[n - 1]
            const avgPerDay = n > 1 ? data.changeAbs / (n - 1) : 0
            return (
              <div className="exp-totals">
                <div><span className="k">Активы</span><span className="v pos">{money(last?.assets ?? 0, data.baseCurrency)}</span></div>
                <div><span className="k">Обязательства</span><span className="v neg">{money(last?.liabilities ?? 0, data.baseCurrency)}</span></div>
                <div><span className="k">В среднем/день</span><span className={`v ${avgPerDay >= 0 ? 'pos' : 'neg'}`}>{signedMoney(Math.round(avgPerDay), data.baseCurrency)}</span></div>
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

          <label className="section-lbl">Снимки капитала</label>
          <div className="list history-list">
            {[...data.points].reverse().map((p) => (
              <div className="li static" key={p.date}>
                <span className="li-main">
                  <span className="li-name">{dateShort(p.date)}</span>
                  <span className="li-sub">снимок капитала</span>
                </span>
                <span className="li-amt">
                  <span className="li-a">{money(p.netWorth, data.baseCurrency)}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
