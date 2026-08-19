import { useEffect, useState } from 'react'
import { getEfficiency, getMe, setIncome, type Efficiency, type User } from '../../api'
import { money, signedMoney, percent, symbol } from '../../format'
import { CURRENCIES } from '../../kinds'
import { Sheet } from '../../components/Sheet'
import { MoneyInput } from '../../components/MoneyInput'
import { BigRing, MonthBars } from './shared'
import { runwayText } from '../EfficiencyScreen'

export function DesktopEfficiency() {
  const [data, setData] = useState<Efficiency | null>(null)
  const [me, setMe] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)
  const load = () => { void getEfficiency().then(setData); void getMe().then(setMe) }
  useEffect(load, [])
  const cur = data?.baseCurrency ?? 'USD'

  if (data && !data.hasIncome) {
    return (
      <div className="dt-grid c-one-full">
        <section className="dt-card dt-pad">
          <p className="muted" style={{ maxWidth: 520 }}>Укажи месячный доход — и увидишь, какая доля зарплаты реально превращается в капитал.</p>
          <button className="dt-btn-brand" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>Указать доход</button>
        </section>
        {editing && <IncomeSheet initialAmount={me?.monthlyIncome ?? 0} initialCurrency={me?.incomeCurrency || cur} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
      </div>
    )
  }

  return (
    <div className="dt-grid c-rail-lg">
      <div className="dt-main-col dt-scrollcol">
        <section className="dt-card dt-pad dt-eff-head">
          {data && <BigRing percent={Math.max(0, data.capitalShare)} />}
          <div className="dt-eff-tx">
            <div className="eyebrow">В капитал со счёта · за месяц</div>
            <div className="dt-cap-hero sm pos">{data ? percent(data.capitalShare, false) : '—'}</div>
            <div className="dt-eff-sub">осталось капиталом от поступлений</div>
          </div>
          <div className="dt-spacer" />
          <button className="dt-btn-ghost" onClick={() => setEditing(true)}>Изменить доход</button>
        </section>

        {data && data.trend.length > 0 && (
          <section className="dt-card dt-pad">
            <div className="dt-card-head"><span className="dt-card-ttl">В капитал по месяцам</span></div>
            <MonthBars trend={data.trend} />
            <div className="clegend" style={{ marginTop: 8 }}>
              {data.trend.map((t) => <div key={t.month}>{t.month.slice(5)}: капитализация {t.capShare > 0 ? percent(t.capShare, false) : '—'}</div>)}
            </div>
            <p className="note">«В капитал со счёта» — доля пришедших на зарплатный счёт денег, оставшаяся капиталом (не снята на траты). Погашение долгов — это капитал, а не трата. Разовые поступления (отпускные) процент не задирают. Столбцы — прирост капитала по месяцам.</p>
          </section>
        )}
      </div>

      <div className="dt-rail">
        <section className="dt-card dt-rc">
          <div className="dt-rc-head"><span>Цифры месяца</span></div>
          {data && (
            <>
              <div className="dt-kv"><span>Пришло на счёт</span><b className="pos">{money(data.inflow, cur)}</b></div>
              <div className="dt-kv"><span>Снято на траты</span><b className="neg">{money(data.spent, cur)}</b></div>
              <div className="dt-kv"><span>Прирост капитала ~30д</span><b className={data.capitalGrowth >= 0 ? 'pos' : 'neg'}>{signedMoney(data.capitalGrowth, cur)}</b></div>
              {data.monthExpenses > 0 && <div className="dt-kv"><span>Расходы</span><b className="neg">{money(data.monthExpenses, cur)}</b></div>}
              {data.savingsRate != null && <div className="dt-kv"><span>Норма сбережений</span><b className="pos">{percent(data.savingsRate, false)}</b></div>}
            </>
          )}
        </section>

        {data && (
          <section className="dt-card dt-rc">
            <div className="dt-rc-head"><span>Долговая нагрузка</span></div>
            <div className="dt-kv"><span>Платежи по кредитам / мес</span><b>{money(data.debtPaymentsMonthly, cur)}</b></div>
            <div className="dt-kv"><span>Доля от дохода</span><b className={data.debtLoadPct > 40 ? 'neg' : ''}>{percent(data.debtLoadPct, false)}</b></div>
            <div className="dt-kv"><span>Проценты по долгам / мес</span><b className="neg">{money(data.interestPaidMonthly, cur)}</b></div>
            <div className="dt-kv"><span>Плечо · долги ÷ активы</span><b>{percent(data.leverage, false)}</b></div>
          </section>
        )}

        {data && (
          <section className="dt-card dt-rc">
            <div className="dt-rc-head"><span>Ликвидность и проценты</span></div>
            <div className="dt-kv"><span>Ликвидные деньги</span><b>{money(data.liquid, cur)}</b></div>
            <div className="dt-kv"><span>Подушка без дохода</span><b className={data.runwayMonths < 3 ? 'neg' : 'pos'}>{runwayText(data.runwayMonths)}</b></div>
            <div className="dt-kv"><span>Проценты по вкладам / мес</span><b className="pos">{money(data.interestEarnedMonthly, cur)}</b></div>
            <div className="dt-kv"><span>Чистые проценты / мес</span><b className={data.netInterestMonthly >= 0 ? 'pos' : 'neg'}>{signedMoney(data.netInterestMonthly, cur)}</b></div>
          </section>
        )}
      </div>

      {editing && <IncomeSheet initialAmount={me?.monthlyIncome ?? 0} initialCurrency={me?.incomeCurrency || cur} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
    </div>
  )
}

function IncomeSheet({ initialAmount, initialCurrency, onClose, onSaved }: { initialAmount: number; initialCurrency: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '')
  const [currency, setCurrency] = useState(initialCurrency)
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try { await setIncome(parseFloat(amount) || 0, currency); onSaved() } finally { setBusy(false) }
  }
  return (
    <Sheet title="Месячный доход" subtitle="зарплата и постоянные поступления" onClose={onClose}>
      <div className="fld"><label>Валюта</label><div className="seg">
        {CURRENCIES.map((c) => <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>)}
      </div></div>
      <div className="fld"><label>Сумма в месяц <span className="hint">· аванс + зарплата</span></label><div className="inp-wrap">
        <span className="inp-pre">{symbol(currency)}</span><MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
      </div></div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
    </Sheet>
  )
}
