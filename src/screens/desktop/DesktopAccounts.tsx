import { useEffect, useState } from 'react'
import {
  getAccounts, createAccount, deleteAccount, getAccountEntries, addAccountEntry, updateAccountEntry, deleteAccountEntry,
  type Account, type AccountEntries, type AccountEntry,
} from '../../api'
import { money, dateTime } from '../../format'
import { CURRENCIES } from '../../kinds'
import { Sheet } from '../../components/Sheet'
import { MoneyInput } from '../../components/MoneyInput'

function sourceTag(s: string): string {
  if (s === 'salary_auto') return 'авто · зарплата'
  if (s === 'debt_payment') return 'платёж по долгу'
  if (s === 'lent_repayment') return 'возврат долга'
  if (s === 'opening') return 'начальный остаток'
  return '—'
}
const locked = (s: string) => s === 'debt_payment' || s === 'opening' || s === 'lent_repayment' || s === 'salary_auto'

export function DesktopAccounts({ initialAccountId, onChanged }: { initialAccountId?: number; onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [sel, setSel] = useState<number | null>(initialAccountId ?? null)
  const [ledger, setLedger] = useState<AccountEntries | null>(null)
  const [creating, setCreating] = useState(false)
  const [add, setAdd] = useState<'income' | 'payment' | null>(null)
  const [edit, setEdit] = useState<AccountEntry | null>(null)

  const loadAccounts = () => void getAccounts().then((a) => {
    setAccounts(a)
    setSel((cur) => cur ?? (a[0]?.id ?? null))
  })
  useEffect(loadAccounts, [])

  const loadLedger = () => { if (sel != null) void getAccountEntries(sel).then(setLedger) }
  useEffect(loadLedger, [sel])

  const refresh = () => { loadLedger(); loadAccounts(); onChanged?.() }
  const cur = ledger?.account.currency ?? 'UZS'

  return (
    <div className="dt-grid c-master">
      <section className="dt-card dt-rc dt-act">
        <div className="dt-rc-head"><span>Счета</span><span className="muted">{accounts?.length ?? 0}</span></div>
        <div className="dt-feed">
          {accounts?.map((a) => (
            <button key={a.id} className={`dt-acc ${a.id === sel ? 'on' : ''}`} onClick={() => setSel(a.id)}>
              <span className="dt-acc-ic">{a.isSalary ? '₿' : '·'}</span>
              <span className="dt-acc-main">
                <span className="dt-acc-nm">{a.name}</span>
                <span className="dt-acc-sub">{a.isSalary ? 'зарплатный' : 'счёт'}</span>
              </span>
              <span className="dt-acc-bal">{money(a.balance, a.currency)}</span>
            </button>
          ))}
        </div>
        <button className="dt-dashed" onClick={() => setCreating(true)}>＋ Создать счёт</button>
        <p className="note">На зарплатный счёт авто-начисляется зарплата, с него же списываются платежи по долгам.</p>
      </section>

      <section className="dt-card dt-pad dt-act">
        {!ledger && <p className="muted">Выбери счёт слева.</p>}
        {ledger && (
          <>
            <div className="dt-led-head">
              <div>
                <div className="eyebrow">Баланс · {ledger.account.name}</div>
                <div className="dt-cap-hero sm">{money(ledger.account.balance, cur)}</div>
                <div className="dt-cap-rule" />
              </div>
              <div className="dt-led-btns">
                <button className="dt-btn-pos" onClick={() => setAdd('income')}>＋ Доход</button>
                <button className="dt-btn-neg" onClick={() => setAdd('payment')}>− Списание</button>
              </div>
            </div>

            <div className="dt-thead dt-led-grid">
              <span>Дата</span><span>Операция</span><span>Источник</span><span className="r">Сумма</span><span />
            </div>
            <div className="dt-tbody">
              {ledger.entries.map((e) => (
                <div key={e.id} className="dt-trow dt-led-grid static">
                  <span className="muted">{dateTime(e.createdAt)}</span>
                  <span>{e.note || (e.kind === 'income' ? 'Доход' : 'Списание')}</span>
                  <span className="muted">{sourceTag(e.source)}</span>
                  <span className={`r num ${e.kind === 'income' ? 'pos' : 'neg'}`}>{e.kind === 'income' ? '+' : '−'}{money(e.amount, cur)}</span>
                  {locked(e.source) ? <span /> : <button className="dt-x" onClick={() => setEdit(e)} aria-label="Изменить">✎</button>}
                </div>
              ))}
              {ledger.entries.length === 0 && <p className="muted" style={{ padding: '14px 0' }}>Движений нет.</p>}
            </div>

            <button className="linkbtn danger" onClick={async () => {
              if (!window.confirm('Удалить счёт? Все его движения удалятся, а платежи по долгам — вернутся долгам.')) return
              await deleteAccount(ledger.account.id)
              setSel(null); setLedger(null); refresh()
            }}>Удалить счёт</button>
          </>
        )}
      </section>

      {creating && <CreateSheet onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); setSel(id); refresh() }} />}
      {add && sel != null && <EntrySheet accountId={sel} kind={add} currency={cur} onClose={() => setAdd(null)} onSaved={() => { setAdd(null); refresh() }} />}
      {edit && sel != null && <EntrySheet accountId={sel} entry={edit} kind={edit.kind} currency={cur} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh() }} />}
    </div>
  )
}

function CreateSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
  const [name, setName] = useState('Зарплатный счёт')
  const [currency, setCurrency] = useState('UZS')
  const [start, setStart] = useState('')
  const [isSalary, setIsSalary] = useState(true)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const acc = await createAccount({ name: name.trim() || 'Счёт', currency, startingBalance: parseFloat(start) || 0, isSalary })
      onSaved(acc.id)
    } finally { setBusy(false) }
  }

  return (
    <Sheet title="Новый счёт" subtitle="сюда приходит доход, отсюда уходят платежи" onClose={onClose}>
      <div className="fld"><label>Название</label><div className="inp-wrap"><input className="inp" value={name} onChange={(e) => setName(e.target.value)} /></div></div>
      <div className="fld"><label>Валюта</label><div className="seg">
        {CURRENCIES.map((c) => <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>)}
      </div></div>
      <div className="fld"><label>Остаток сейчас</label><div className="inp-wrap"><MoneyInput className="inp big" placeholder="0" value={start} onChange={setStart} /></div></div>
      <div className="soon-row">
        <div className="rate-l">Зарплатный счёт<small>сюда авто-начисляется зарплата</small></div>
        <button type="button" className={`switch ${isSalary ? 'on' : ''}`} onClick={() => setIsSalary((v) => !v)} aria-pressed={isSalary} />
      </div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : 'Создать'}</button>
    </Sheet>
  )
}

function EntrySheet({ accountId, entry, kind, currency, onClose, onSaved }: {
  accountId: number; entry?: AccountEntry; kind: 'income' | 'payment'; currency: string; onClose: () => void; onSaved: () => void
}) {
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    const amt = parseFloat(amount)
    if (!Number.isFinite(amt) || amt <= 0) return
    setBusy(true)
    try {
      const body = { kind, amount: amt, note: note.trim() }
      if (entry) await updateAccountEntry(entry.id, body)
      else await addAccountEntry(accountId, body)
      onSaved()
    } finally { setBusy(false) }
  }
  async function remove() {
    if (!entry || !window.confirm('Удалить запись?')) return
    setBusy(true)
    try { await deleteAccountEntry(entry.id); onSaved() } finally { setBusy(false) }
  }

  const title = kind === 'income' ? 'Доход' : 'Списание'
  return (
    <Sheet title={entry ? `Изменить · ${title}` : title} subtitle={currency} onClose={onClose}>
      <div className="fld"><label>Сумма</label><div className="inp-wrap"><MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} /></div></div>
      <div className="fld"><label>Заметка <span className="hint">· напр. премия</span></label><div className="inp-wrap"><input className="inp" value={note} onChange={(e) => setNote(e.target.value)} /></div></div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : entry ? 'Сохранить' : 'Добавить'}</button>
      {entry && <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить</button>}
    </Sheet>
  )
}
