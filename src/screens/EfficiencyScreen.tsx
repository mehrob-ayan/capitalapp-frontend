import { useEffect, useState } from 'react'
import { getEfficiency, getMe, setIncome, type Efficiency, type User } from '../api'
import { money, signedMoney, percent, symbol } from '../format'
import { CURRENCIES } from '../kinds'
import { Ring } from '../components/Ring'
import { TopBar } from '../components/TopBar'
import { Sheet } from '../components/Sheet'

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

          <p className="note">
            «В капитал из дохода» включает и рост активов, и курс — не только твои сбережения. Норма сбережений (доход − расходы) точнее; она появляется, когда трекаешь расходы через бота.
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
          <input className="inp big" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
    </Sheet>
  )
}
