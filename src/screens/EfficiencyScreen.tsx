import { useEffect, useState } from 'react'
import { getEfficiency, getMe, setIncome, type Efficiency, type EffMonth, type User } from '../api'
import { money, signedMoney, percent, symbol } from '../format'
import { CURRENCIES } from '../kinds'
import { Ring } from '../components/Ring'
import { TopBar } from '../components/TopBar'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'

export function EfficiencyScreen({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<Efficiency | null>(null)
  const [me, setMe] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)

  const load = () => {
    void getEfficiency().then(setData)
    void getMe().then(setMe)
  }
  useEffect(load, [])

  const cur = data?.baseCurrency ?? 'USD'

  return (
    <div className="pad-screen with-back">
      {onBack ? <TopBar title="Доход и эффективность" onBack={onBack} /> : <div className="topbar">Доход и эффективность</div>}

      {!data && <p className="muted">Загрузка…</p>}

      {data && !data.hasIncome && (
        <>
          <p className="muted empty">Укажи месячный доход — и увидишь, какая доля зарплаты реально превращается в капитал.</p>
          <button className="mainbtn" onClick={() => setEditing(true)}>Указать доход</button>
        </>
      )}

      {data && data.hasIncome && (
        <>
          <div className="eyebrow">В капитал из дохода · ~30 дней</div>
          <div className="ring-row">
            <Ring percent={Math.max(0, data.capitalShare)} />
            <div>
              <div className={`hero small ${data.capitalShare >= 0 ? 'pos' : 'neg'}`}>{percent(data.capitalShare, false)}</div>
              <small className="muted">прирост капитала ÷ доход</small>
            </div>
          </div>

          <div className="stat">
            <div className="stat-r"><div className="stat-k">Доход в месяц</div><div className="stat-v">{money(data.monthlyIncome, cur)}</div></div>
            {data.monthExpenses > 0 && (
              <div className="stat-r"><div className="stat-k">Расходы в этом месяце</div><div className="stat-v neg">{money(data.monthExpenses, cur)}</div></div>
            )}
            <div className="stat-r"><div className="stat-k">Прирост капитала ~30д</div><div className={`stat-v ${data.capitalGrowth >= 0 ? 'pos' : 'neg'}`}>{signedMoney(data.capitalGrowth, cur)}</div></div>
            {data.savingsRate != null && (
              <div className="stat-r"><div className="stat-k">Норма сбережений</div><div className="stat-v pos">{percent(data.savingsRate, false)}</div></div>
            )}
          </div>

          {data.trend.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">В капитал по месяцам</div>
              <MonthBars trend={data.trend} />
            </div>
          )}

          <p className="note">
            «В капитал из дохода» включает и рост активов, и курс — не только твои сбережения. Норма сбережений (доход − расходы) точнее; она появляется, когда трекаешь расходы через бота. График наполнится с накоплением истории по месяцам.
          </p>

          <button className="linkbtn" onClick={() => setEditing(true)}>Изменить доход</button>
        </>
      )}

      {editing && (
        <IncomeSheet
          initialAmount={me?.monthlyIncome ?? 0}
          initialCurrency={me?.incomeCurrency || cur}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load() }}
        />
      )}
    </div>
  )
}

// Bars of capital added per month (green up / red down), scaled to the largest.
function MonthBars({ trend }: { trend: EffMonth[] }) {
  const W = 300
  const H = 74
  const max = Math.max(1, ...trend.map((t) => Math.abs(t.growth)))
  const n = trend.length
  const slot = W / n
  const bw = Math.min(30, slot * 0.5)
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="chart-svg" role="img" aria-label="В капитал по месяцам">
      {trend.map((t, i) => {
        const cx = i * slot + slot / 2
        const h = (Math.abs(t.growth) / max) * H
        const up = t.growth >= 0
        return (
          <g key={t.month}>
            <rect x={(cx - bw / 2).toFixed(1)} y={(H - h).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} rx="3" fill={up ? 'var(--pos)' : 'var(--neg)'} />
            <text x={cx.toFixed(1)} y={H + 11} fontSize="8" textAnchor="middle" fill="var(--muted)">{t.month.slice(5)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function IncomeSheet({
  initialAmount, initialCurrency, onClose, onSaved,
}: {
  initialAmount: number
  initialCurrency: string
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '')
  const [currency, setCurrency] = useState(initialCurrency)
  const [busy, setBusy] = useState(false)

  async function save() {
    const n = parseFloat(amount) || 0
    setBusy(true)
    try { await setIncome(n, currency); onSaved() } finally { setBusy(false) }
  }

  return (
    <Sheet title="Месячный доход" subtitle="зарплата и постоянные поступления" onClose={onClose}>
      <div className="fld">
        <label>Валюта</label>
        <div className="seg">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="fld">
        <label>Сумма в месяц <span className="hint">· аванс + зарплата</span></label>
        <div className="inp-wrap">
          <span className="inp-pre">{symbol(currency)}</span>
          <MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
        </div>
      </div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
    </Sheet>
  )
}
