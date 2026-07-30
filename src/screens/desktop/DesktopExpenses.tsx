import { useEffect, useMemo, useState } from 'react'
import { getExpenses, getExpenseCategories, createExpenseTx, deleteExpenseTx, type Expenses as ExpensesData, type Transaction } from '../../api'
import { money, monthYear, dateShort } from '../../format'
import { Donut, colorFor } from '../../components/Donut'
import { MoneyInput } from '../../components/MoneyInput'
import { TrendBars } from './shared'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function DesktopExpenses({ onMeta }: { onMeta?: (sub: string) => void }) {
  const [month, setMonth] = useState(currentMonth())
  const [person, setPerson] = useState('')
  const [data, setData] = useState<ExpensesData | null>(null)
  const [cats, setCats] = useState<{ expense: string[]; income: string[] } | null>(null)

  const load = () => void getExpenses(month, person).then(setData)
  useEffect(load, [month, person])
  useEffect(() => { void getExpenseCategories().then(setCats) }, [])
  useEffect(() => { if (data) onMeta?.(`${monthYear(`${month}-01`)} · ${data.transactions.length} операций`) }, [data, month, onMeta])

  const cur = data?.currency ?? 'UZS'
  const colorByCat = useMemo(() => {
    const map: Record<string, string> = {}
    data?.byCategory.forEach((s, i) => (map[s.category] = colorFor(i)))
    return map
  }, [data])

  async function remove(t: Transaction) {
    if (!window.confirm(`Удалить: ${t.category} · ${money(t.amount, t.currency)}?`)) return
    await deleteExpenseTx(t.id)
    load()
  }

  return (
    <div className="dt-grid c-rail">
      <div className="dt-main-col dt-scrollcol">
        <section className="dt-card dt-pad dt-exp-top">
          <div className="dt-month">
            <button onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Прошлый месяц">‹</button>
            <span>{monthYear(`${month}-01`)}</span>
            <button onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Следующий месяц">›</button>
          </div>
          {data && data.people.length > 0 && (
            <div className="dt-chips wrap">
              <button className={person === '' ? 'on' : ''} onClick={() => setPerson('')}>Все</button>
              {data.people.map((p) => <button key={p} className={person === p ? 'on' : ''} onClick={() => setPerson(p)}>{p}</button>)}
            </div>
          )}
          <div className="dt-spacer" />
          {data && (
            <div className="dt-exp-metrics">
              <div><span>Доход</span><b className="pos">{money(data.income, cur)}</b></div>
              <div><span>Расход</span><b className="neg">{money(data.expense, cur)}</b></div>
              <div><span>Баланс</span><b className={data.balance >= 0 ? 'pos' : 'neg'}>{money(data.balance, cur)}</b></div>
            </div>
          )}
        </section>

        {data && data.trend.some((t) => t.income > 0 || t.expense > 0) && (
          <section className="dt-card dt-pad">
            <div className="dt-card-head"><span className="dt-card-ttl">Доход и расход по месяцам</span>
              <div className="clegend"><div><i style={{ background: 'var(--pos)' }} />Доход</div><div><i style={{ background: 'var(--neg)' }} />Расход</div></div>
            </div>
            <TrendBars trend={data.trend} />
          </section>
        )}

        <section className="dt-card dt-pad dt-act">
          <div className="dt-card-head"><span className="dt-card-ttl">Операции</span></div>
          <div className="dt-thead dt-exp-grid">
            <span>Дата</span><span>Категория</span><span>Кто</span><span>Заметка</span><span className="r">Сумма</span><span />
          </div>
          <div className="dt-tbody">
            {data?.transactions.map((t) => (
              <div key={t.id} className="dt-trow dt-exp-grid static">
                <span className="muted">{dateShort(t.date).split(' ').slice(0, 2).join(' ')}</span>
                <span className="dt-tc-name"><i style={{ background: t.type === 'income' ? 'var(--pos)' : colorByCat[t.category] ?? 'var(--muted)' }} />{t.category}</span>
                <span className="muted">{t.person || '—'}</span>
                <span className="muted ell">{t.note || '—'}</span>
                <span className={`r num ${t.type === 'income' ? 'pos' : 'neg'}`}>{t.type === 'income' ? '+' : '−'}{money(t.amount, t.currency)}</span>
                <button className="dt-x" onClick={() => remove(t)} aria-label="Удалить">✕</button>
              </div>
            ))}
            {data && data.transactions.length === 0 && <p className="muted" style={{ padding: '14px 0' }}>За этот месяц операций нет.</p>}
          </div>
        </section>
      </div>

      <div className="dt-rail">
        {data && data.byCategory.length > 0 && (
          <section className="dt-card dt-rc">
            <div className="dt-rc-head"><span>Куда ушло</span></div>
            <Donut slices={data.byCategory} total={data.expense} currency={cur} />
            <div className="clegend exp-legend">
              {data.byCategory.map((s) => <div key={s.category}><i style={{ background: colorByCat[s.category] }} />{s.category} · {Math.round(s.percent)}%</div>)}
            </div>
          </section>
        )}
        {cats && <QuickAddPanel categories={cats} currency={cur} onSaved={load} />}
      </div>
    </div>
  )
}

function QuickAddPanel({ categories, currency, onSaved }: { categories: { expense: string[]; income: string[] }; currency: string; onSaved: () => void }) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const list = type === 'expense' ? categories.expense : categories.income

  async function save() {
    const amt = parseFloat(amount)
    if (!category || !Number.isFinite(amt) || amt <= 0) return
    setBusy(true)
    try {
      await createExpenseTx({ type, category, amount: amt, currency })
      setAmount('')
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <section className="dt-card dt-rc">
      <div className="dt-rc-head"><span>Быстрый ввод</span></div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button type="button" className={type === 'expense' ? 'on' : ''} onClick={() => { setType('expense'); setCategory('') }}>Расход</button>
        <button type="button" className={type === 'income' ? 'on' : ''} onClick={() => { setType('income'); setCategory('') }}>Доход</button>
      </div>
      <div className="cat-grid" style={{ marginBottom: 12 }}>
        {list.map((c) => <button key={c} type="button" className={`cat-btn ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
      </div>
      <div className="inp-wrap" style={{ marginBottom: 12 }}>
        <MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
        <span className="inp-suf">{currency}</span>
      </div>
      <button className="mainbtn" style={{ marginTop: 0 }} disabled={busy || !category || !amount}
        onClick={save} onKeyDown={(e) => { if (e.key === 'Enter') save() }}>
        {busy ? 'Сохранение…' : 'Добавить'}
      </button>
      <p className="note">Enter сохраняет и оставляет фокус — можно вводить несколько операций подряд.</p>
    </section>
  )
}
