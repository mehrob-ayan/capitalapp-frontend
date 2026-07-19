import { useEffect, useMemo, useState } from 'react'
import {
  getExpenses, getExpenseCategories, createExpenseTx, deleteExpenseTx,
  type Expenses as ExpensesData, type Transaction,
} from '../api'
import { money, monthYear, dateShort } from '../format'
import { Donut, colorFor } from '../components/Donut'
import { Sheet } from '../components/Sheet'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Expenses() {
  const [month, setMonth] = useState(currentMonth())
  const [person, setPerson] = useState<string>('')
  const [data, setData] = useState<ExpensesData | null>(null)
  const [cats, setCats] = useState<{ expense: string[]; income: string[] } | null>(null)
  const [adding, setAdding] = useState(false)

  const load = () => void getExpenses(month, person).then(setData)
  useEffect(load, [month, person])
  useEffect(() => { void getExpenseCategories().then(setCats) }, [])

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
    <div className="pad-screen">
      <div className="topbar">Расходы</div>

      <div className="month-nav">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Прошлый месяц">‹</button>
        <span>{monthYear(`${month}-01`)}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Следующий месяц">›</button>
      </div>

      {data && data.people.length > 0 && (
        <div className="chips">
          <button className={person === '' ? 'on' : ''} onClick={() => setPerson('')}>Все</button>
          {data.people.map((p) => (
            <button key={p} className={person === p ? 'on' : ''} onClick={() => setPerson(p)}>{p}</button>
          ))}
        </div>
      )}

      {!data && <p className="muted">Загрузка…</p>}

      {data && (
        <>
          <div className="exp-totals">
            <div><span className="k">Доход</span><span className="v pos">{money(data.income, cur)}</span></div>
            <div><span className="k">Расход</span><span className="v neg">{money(data.expense, cur)}</span></div>
            <div><span className="k">Баланс</span><span className={`v ${data.balance >= 0 ? 'pos' : 'neg'}`}>{money(data.balance, cur)}</span></div>
          </div>

          {data.byCategory.length > 0 ? (
            <>
              <Donut slices={data.byCategory} total={data.expense} currency={cur} />
              <div className="clegend exp-legend">
                {data.byCategory.map((s) => (
                  <div key={s.category}>
                    <i style={{ background: colorByCat[s.category] }} />
                    {s.category} · {Math.round(s.percent)}%
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted empty">За этот месяц расходов нет. Добавь через бота или кнопкой ниже.</p>
          )}

          <label className="section-lbl">Операции</label>
          <div className="list">
            {data.transactions.map((t) => (
              <button key={t.id} className="li" onClick={() => remove(t)}>
                <span className="li-mark" style={{ background: t.type === 'income' ? 'var(--pos)' : colorByCat[t.category] ?? 'var(--muted)' }}>
                  {t.category.slice(0, 1)}
                </span>
                <span className="li-main">
                  <span className="li-name">{t.category}</span>
                  <span className="li-sub">{[dateShort(t.date), t.person, t.note].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="li-amt">
                  <span className={`li-a ${t.type === 'income' ? 'pos' : 'neg'}`}>
                    {t.type === 'income' ? '+' : '−'}{money(t.amount, t.currency)}
                  </span>
                </span>
              </button>
            ))}
            {data.transactions.length === 0 && <div className="emptycat">Операций нет</div>}
          </div>

          <button className="mainbtn" onClick={() => setAdding(true)}>＋ Добавить</button>
        </>
      )}

      {adding && cats && (
        <QuickAdd categories={cats} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load() }} />
      )}
    </div>
  )
}

function QuickAdd({
  categories,
  onCancel,
  onSaved,
}: {
  categories: { expense: string[]; income: string[] }
  onCancel: () => void
  onSaved: () => void
}) {
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
      await createExpenseTx({ type, category, amount: amt, currency: 'UZS' })
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Добавить" subtitle="расход или доход" onClose={onCancel}>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button type="button" className={type === 'expense' ? 'on' : ''} onClick={() => { setType('expense'); setCategory('') }}>Расход</button>
        <button type="button" className={type === 'income' ? 'on' : ''} onClick={() => { setType('income'); setCategory('') }}>Доход</button>
      </div>

      <label className="section-lbl">Категория</label>
      <div className="cat-grid">
        {list.map((c) => (
          <button key={c} type="button" className={`cat-btn ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <div className="fld" style={{ marginTop: 14 }}>
        <label>Сумма</label>
        <div className="inp-wrap">
          <input className="inp big" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="inp-suf">сўм</span>
        </div>
      </div>

      <button className="mainbtn" disabled={busy || !category || !amount} onClick={save}>
        {busy ? 'Сохранение…' : 'Добавить'}
      </button>
    </Sheet>
  )
}
