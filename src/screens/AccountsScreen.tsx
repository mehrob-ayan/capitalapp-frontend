import { useEffect, useState } from 'react'
import {
  getAccounts, createAccount, deleteAccount, getAccountEntries, addAccountEntry, updateAccountEntry, deleteAccountEntry,
  type Account, type AccountEntries, type AccountEntry,
} from '../api'
import { money, dateTime } from '../format'
import { CURRENCIES } from '../kinds'
import { TopBar } from '../components/TopBar'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'

export function AccountsScreen({ onBack, onChanged, initialAccountId }: { onBack?: () => void; onChanged?: () => void; initialAccountId?: number }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [openId, setOpenId] = useState<number | null>(initialAccountId ?? null)
  const [creating, setCreating] = useState(false)

  const load = () => void getAccounts().then(setAccounts)
  useEffect(load, [])

  if (openId != null) {
    // Opened straight into one account (from the overview) → back leaves the
    // screen; drilled in from the list → back returns to the list.
    const onBackLedger = initialAccountId != null ? (onBack ?? (() => {})) : () => { setOpenId(null); load() }
    return <Ledger id={openId} onBack={onBackLedger} onChanged={onChanged} />
  }

  return (
    <div className="pad-screen with-back">
      {onBack ? <TopBar title="Счета" onBack={onBack} /> : <div className="topbar">Счета</div>}

      {!accounts && <p className="muted">Загрузка…</p>}
      {accounts && accounts.length === 0 && (
        <p className="muted empty">Счетов пока нет. Заведи зарплатный счёт — туда будет попадать доход, а платежи по долгам будут списываться отсюда.</p>
      )}

      {accounts && accounts.length > 0 && (
        <div className="list">
          {accounts.map((a) => (
            <button key={a.id} className="li" onClick={() => setOpenId(a.id)}>
              <span className="li-mark" style={{ background: 'var(--brand)' }}>{a.isSalary ? '₿' : '·'}</span>
              <span className="li-main">
                <span className="li-name">{a.name}</span>
                <span className="li-sub">{a.isSalary ? 'зарплатный' : 'счёт'}</span>
              </span>
              <span className="li-amt"><span className="li-a">{money(a.balance, a.currency)}</span></span>
            </button>
          ))}
        </div>
      )}

      {accounts && <button className="tile add-goal" onClick={() => setCreating(true)}><b>＋ Создать счёт</b></button>}

      {creating && (
        <CreateSheet onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); onChanged?.() }} />
      )}
    </div>
  )
}

function Ledger({ id, onBack, onChanged }: { id: number; onBack: () => void; onChanged?: () => void }) {
  const [data, setData] = useState<AccountEntries | null>(null)
  const [add, setAdd] = useState<'income' | 'payment' | null>(null)
  const [edit, setEdit] = useState<AccountEntry | null>(null)

  const load = () => void getAccountEntries(id).then(setData)
  useEffect(load, [id])

  const cur = data?.account.currency ?? 'UZS'
  const refresh = () => { load(); onChanged?.() }

  return (
    <div className="pad-screen with-back">
      <TopBar title={data?.account.name ?? 'Счёт'} onBack={onBack} />
      {!data && <p className="muted">Загрузка…</p>}
      {data && (
        <>
          <div className="eyebrow">Баланс</div>
          <div className="hero small">{money(data.account.balance, cur)}</div>
          <div className="rule" />

          <div className="seg" style={{ marginBottom: 12 }}>
            <button type="button" onClick={() => setAdd('income')}>＋ Доход</button>
            <button type="button" onClick={() => setAdd('payment')}>− Списание</button>
          </div>

          <label className="section-lbl">Движения</label>
          <div className="list">
            {data.entries.map((e) => (
              <button
                key={e.id}
                className="li"
                onClick={() => { if (e.source !== 'debt_payment' && e.source !== 'opening') setEdit(e) }}
              >
                <span className="li-main">
                  <span className="li-name">{e.note || (e.kind === 'income' ? 'Доход' : 'Списание')}</span>
                  <span className="li-sub">{dateTime(e.createdAt)}{sourceTag(e.source)}</span>
                </span>
                <span className="li-amt">
                  <span className={`li-a ${e.kind === 'income' ? 'pos' : 'neg'}`}>
                    {e.kind === 'income' ? '+' : '−'}{money(e.amount, cur)}
                  </span>
                </span>
              </button>
            ))}
            {data.entries.length === 0 && <div className="emptycat">Движений нет</div>}
          </div>

          <button
            className="linkbtn danger"
            onClick={async () => {
              if (!window.confirm('Удалить счёт? Все его движения удалятся, а платежи по долгам с него — вернутся долгам.')) return
              await deleteAccount(id)
              onChanged?.()
              onBack()
            }}
          >
            Удалить счёт
          </button>
        </>
      )}

      {add && data && (
        <EntrySheet accountId={id} kind={add} currency={cur} onClose={() => setAdd(null)} onSaved={() => { setAdd(null); refresh() }} />
      )}
      {edit && data && (
        <EntrySheet accountId={id} entry={edit} kind={edit.kind} currency={cur} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh() }} />
      )}
    </div>
  )
}

function sourceTag(s: string): string {
  if (s === 'salary_auto') return ' · зарплата'
  if (s === 'debt_payment') return ' · платёж по долгу'
  if (s === 'opening') return ' · начальный остаток'
  return ''
}

function CreateSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('Зарплатный счёт')
  const [currency, setCurrency] = useState('UZS')
  const [start, setStart] = useState('')
  const [isSalary, setIsSalary] = useState(true)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await createAccount({ name: name.trim() || 'Счёт', currency, startingBalance: parseFloat(start) || 0, isSalary })
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <Sheet title="Новый счёт" subtitle="сюда приходит доход, отсюда уходят платежи" onClose={onClose}>
      <div className="fld"><label>Название</label><div className="inp-wrap">
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
      </div></div>
      <div className="fld"><label>Валюта</label><div className="seg">
        {CURRENCIES.map((c) => <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>)}
      </div></div>
      <div className="fld"><label>Остаток сейчас</label><div className="inp-wrap">
        <MoneyInput className="inp big" placeholder="0" value={start} onChange={setStart} />
      </div></div>
      <div className="soon-row">
        <div className="rate-l">Зарплатный счёт<small>сюда авто-начисляется зарплата</small></div>
        <button type="button" className={`switch ${isSalary ? 'on' : ''}`} onClick={() => setIsSalary((v) => !v)} aria-pressed={isSalary} />
      </div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : 'Создать'}</button>
    </Sheet>
  )
}

function EntrySheet({
  accountId, entry, kind, currency, onClose, onSaved,
}: {
  accountId: number
  entry?: AccountEntry
  kind: 'income' | 'payment'
  currency: string
  onClose: () => void
  onSaved: () => void
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
      <div className="fld"><label>Сумма</label><div className="inp-wrap">
        <MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
      </div></div>
      <div className="fld"><label>Заметка <span className="hint">· напр. отпускные, премия</span></label><div className="inp-wrap">
        <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} />
      </div></div>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : entry ? 'Сохранить' : 'Добавить'}</button>
      {entry && <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить</button>}
    </Sheet>
  )
}
