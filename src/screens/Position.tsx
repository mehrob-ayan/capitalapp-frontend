import { useEffect, useState } from 'react'
import { getAssetHistory, getAccounts, payDebt, getDebtPayments, repayLent, getLentRepayments, topupDeposit, type Asset, type AssetHistory, type Account, type AccountEntry } from '../api'
import { KIND_META, kindColor } from '../kinds'
import { money, percent, monthYear, duration, dateShort } from '../format'
import { TopBar } from '../components/TopBar'
import { AreaChart } from '../components/AreaChart'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'

// A monetary default for a pay/repay field, rounded to 2 decimals, as a raw
// string — empty when there is no sensible amount to prefill.
function prefillAmount(v: number): string {
  return v > 0 ? String(Math.round(v * 100) / 100) : ''
}

const VALUE_CHART_KINDS = new Set(['realestate', 'car', 'investment', 'metals'])

const SUBTYPE_LABEL: Record<string, string> = { stock: 'Акции', bond: 'Облигации', fund: 'Фонд' }

export function Position({
  asset,
  onBack,
  onEdit,
  onDelete,
  onChanged,
}: {
  asset: Asset
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onChanged?: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [topup, setTopup] = useState(false)
  const meta = KIND_META[(asset.kind as keyof typeof KIND_META)] ?? KIND_META.cash
  const cur = asset.currency
  const isDebt = asset.kind === 'debt'
  const isLent = asset.kind === 'lent'
  const isDeposit = asset.kind === 'deposit'
  const loan = asset.metrics.loan
  const showValueChart = VALUE_CHART_KINDS.has(asset.kind)
  // Deposits accrue: the "value now" is the compounded balance, not the entered principal.
  const accrued = asset.metrics.accruedValue
  // Тело = total contributions (invested); interest = accrued − contributions, so
  // it survives capitalization/top-ups. Fall back to value for legacy rows.
  const depositBody = isDeposit ? (asset.invested > 0 ? asset.invested : asset.value) : asset.value
  const depositInterest = isDeposit ? accrued - depositBody : 0

  const [history, setHistory] = useState<AssetHistory | null>(null)
  useEffect(() => {
    if (showValueChart) void getAssetHistory(asset.id).then(setHistory)
  }, [asset.id, showValueChart])

  const [payments, setPayments] = useState<AccountEntry[]>([])
  useEffect(() => {
    if (isDebt) void getDebtPayments(asset.id).then(setPayments)
    else if (isLent) void getLentRepayments(asset.id).then(setPayments)
  }, [asset.id, isDebt, isLent])

  return (
    <div className="pad-screen with-back">
      <TopBar title={asset.name} onBack={onBack} />

      <div className="pos-badge">
        <span className="pos-ic" style={{ background: kindColor(asset.kind) }}>{meta.letter}</span>
        <span>
          <span className="pos-ttl">{badgeLine(asset)}</span>
          <span className="pos-nm">{asset.name}</span>
        </span>
      </div>

      <div className="eyebrow">{isDebt ? 'Остаток долга сегодня' : isDeposit ? 'Сумма сегодня' : isLent ? 'Ещё вернут' : 'Стоит сейчас'}</div>
      <div className={`hero small ${isDebt ? 'neg' : isLent ? 'pos' : ''}`}>
        {isDebt ? '−' : ''}{money(isDebt && loan ? loan.outstanding : isDeposit ? accrued : asset.value, cur)}
      </div>
      {isDeposit && depositInterest > 0 && (
        <div className="delta pos">▲ капитализация +{money(depositInterest, cur)}</div>
      )}
      <div className="rule" />

      {isDebt && loan ? (
        <>
          <div className="stat">
            {loan.monthlyPayment > 0 && <Row k="Платёж в месяц" v={money(loan.monthlyPayment, cur)} />}
            {loan.monthlyPayment > 0 && asset.ratePercent > 0 && <Row k="— проценты" v={money(loan.interestPart, cur)} cls="neg" />}
            {loan.monthlyPayment > 0 && asset.ratePercent > 0 && <Row k="— тело долга" v={money(loan.principalPart, cur)} cls="pos" />}
            <Row k="Ставка" v={asset.ratePercent > 0 ? `${asset.ratePercent}% годовых` : 'без процентов'} />
            {loan.remainingMonths > 0 && <Row k="Осталось платить" v={duration(loan.remainingMonths)} />}
            {loan.totalInterest > 0 && <Row k="Переплата всего" v={money(loan.totalInterest, cur)} cls="neg" />}
            {loan.remainingMonths > 0 && <Row k="Закрытие" v={monthYear(loan.payoffDate)} />}
          </div>
          <p className="note">{debtNote(asset, loan.outstanding, cur)}</p>
        </>
      ) : isLent ? (
        <>
          <div className="stat">
            <Row k="Дал в долг" v={money(asset.value, cur)} />
            {asset.monthlyPayment > 0 && <Row k="Возврат в месяц" v={money(asset.monthlyPayment, cur)} cls="pos" />}
          </div>
          <p className="note">Тебе должны вернуть эту сумму — она в твоих активах. Отмечай возврат кнопкой «Получить возврат»: деньги придут на счёт, а долг тебе уменьшится.</p>
        </>
      ) : (
        <>
          {showValueChart && history && (
            <div className="chart-card">
              <div className="chart-title">Стоимость по месяцам</div>
              <AreaChart values={history.points.map((p) => p.value)} />
            </div>
          )}
          {isDeposit ? (
            <>
              <div className="stat">
                <Row k="Вложено" v={money(depositBody, cur)} />
                <Row k="Ставка" v={asset.ratePercent > 0 ? `${asset.ratePercent}% годовых` : 'без процентов'} />
                {depositInterest > 0 && <Row k="Начислено процентов" v={`+${money(depositInterest, cur)}`} cls="pos" />}
                {asset.ratePercent > 0 && <Row k="В день" v={`~${money((accrued * asset.ratePercent) / 100 / 365, cur)}`} cls="pos" />}
              </div>
              <p className="note">Проценты капают каждый день и уже включены в сумму. Редактирование не сбрасывает накопленное.</p>
            </>
          ) : (
            <>
              <div className="stat">
                {asset.invested > 0 && <Row k="Вложил" v={money(asset.invested, cur)} />}
                <Row k="Стоит сейчас" v={money(asset.value, cur)} />
                {asset.invested > 0 && (
                  <Row k="Прибыль" v={`${money(asset.metrics.profit, cur)} · ${percent(asset.metrics.profitPercent)}`} cls={asset.metrics.profit >= 0 ? 'pos' : 'neg'} />
                )}
                {asset.monthlyIncome > 0 && <Row k="Приносит в месяц" v={money(asset.monthlyIncome, cur)} />}
                {asset.metrics.cashYieldPercent > 0 && <Row k="Кешфлоу" v={`${percent(asset.metrics.cashYieldPercent, false)} годовых`} cls="gold" />}
                {asset.metrics.cagrPercent !== 0 && <Row k="Доходность" v={`${percent(asset.metrics.cagrPercent)} годовых`} cls="pos" />}
                {asset.maintenanceHours > 0 && <Row k="Обслуживание" v={`~${asset.maintenanceHours} ч/год`} />}
              </div>
              <p className="note">Кешфлоу — доход к вложенному. Доходность — рост за год с учётом цены. Считаются сами.</p>
            </>
          )}
        </>
      )}

      {asset.excludeFromNetWorth && (
        <p className="note">Не входит в чистый капитал — учитывается только в своём разделе.</p>
      )}

      {(isDebt || isLent) && payments.length > 0 && (
        <>
          <label className="section-lbl">{isLent ? 'История возвратов' : 'История платежей'}</label>
          <div className="list">
            {payments.map((p) => (
              <div className="li static" key={p.id}>
                <span className="li-main">
                  <span className="li-name">{p.note || (isLent ? 'Возврат' : 'Платёж')}</span>
                  <span className="li-sub">{dateShort(p.date)}</span>
                </span>
                <span className="li-amt"><span className={`li-a ${isLent ? 'pos' : 'neg'}`}>{isLent ? '+' : '−'}{money(p.debtAmount ?? p.amount, cur)}</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {isDebt && <button className="mainbtn" onClick={() => setPaying(true)}>Внести платёж</button>}
      {isLent && <button className="mainbtn" onClick={() => setPaying(true)}>Получить возврат</button>}
      {isDeposit && <button className="mainbtn" onClick={() => setTopup(true)}>Пополнить</button>}
      <button className={isDebt || isLent || isDeposit ? 'linkbtn' : 'mainbtn'} onClick={onEdit}>Изменить</button>
      <button className="linkbtn danger" onClick={onDelete}>Удалить</button>

      {paying && (isLent
        ? <RepaySheet asset={asset} onClose={() => setPaying(false)} onDone={() => { setPaying(false); onChanged?.(); onBack() }} />
        : <PaySheet asset={asset} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); onChanged?.(); onBack() }} />
      )}
      {topup && <TopUpSheet asset={asset} onClose={() => setTopup(false)} onDone={() => { setTopup(false); onChanged?.() }} />}
    </div>
  )
}

export function PaySheet({ asset, onClose, onPaid }: { asset: Asset; onClose: () => void; onPaid: () => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accId, setAccId] = useState<number | null>(null)
  // Prefill with the debt's monthly payment — the amount you almost always pay.
  const [amount, setAmount] = useState(() => prefillAmount(asset.metrics.loan?.monthlyPayment ?? asset.monthlyPayment))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getAccounts().then((a) => { setAccounts(a); if (a.length) setAccId((a.find((x) => x.isSalary) ?? a[0]).id) })
  }, [])

  async function save() {
    const amt = parseFloat(amount)
    if (!accId || !Number.isFinite(amt) || amt <= 0) return
    setBusy(true)
    try { await payDebt(asset.id, { amount: amt, accountId: accId }); onPaid() } finally { setBusy(false) }
  }

  return (
    <Sheet title="Внести платёж" subtitle={asset.name} onClose={onClose}>
      {accounts && accounts.length === 0 ? (
        <p className="muted">Сначала заведи счёт в разделе «Счета» — платёж списывается с него.</p>
      ) : (
        <>
          <div className="fld"><label>Со счёта</label><div className="seg">
            {accounts?.map((a) => (
              <button key={a.id} type="button" className={a.id === accId ? 'on' : ''} onClick={() => setAccId(a.id)}>{a.name}</button>
            ))}
          </div></div>
          <div className="fld"><label>Сумма платежа ({asset.currency})</label><div className="inp-wrap">
            <MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
          </div></div>
          <p className="note">Спишется со счёта и уменьшит долг. Капитал изменится только на проценты — тело долга переходит из денег в погашение.</p>
          <button className="mainbtn" disabled={busy || !accId} onClick={save}>{busy ? 'Проведение…' : 'Оплатить'}</button>
        </>
      )}
    </Sheet>
  )
}

export function RepaySheet({ asset, onClose, onDone }: { asset: Asset; onClose: () => void; onDone: () => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accId, setAccId] = useState<number | null>(null)
  // Prefill with the expected monthly repayment when one is set.
  const [amount, setAmount] = useState(() => prefillAmount(asset.monthlyPayment))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getAccounts().then((a) => { setAccounts(a); if (a.length) setAccId((a.find((x) => x.isSalary) ?? a[0]).id) })
  }, [])

  async function save() {
    const amt = parseFloat(amount)
    if (!accId || !Number.isFinite(amt) || amt <= 0) return
    setBusy(true)
    try { await repayLent(asset.id, { amount: amt, accountId: accId }); onDone() } finally { setBusy(false) }
  }

  return (
    <Sheet title="Получить возврат" subtitle={asset.name} onClose={onClose}>
      {accounts && accounts.length === 0 ? (
        <p className="muted">Сначала заведи счёт в разделе «Счета» — возврат придёт на него.</p>
      ) : (
        <>
          <div className="fld"><label>На счёт</label><div className="seg">
            {accounts?.map((a) => (
              <button key={a.id} type="button" className={a.id === accId ? 'on' : ''} onClick={() => setAccId(a.id)}>{a.name}</button>
            ))}
          </div></div>
          <div className="fld"><label>Сумма возврата ({asset.currency})</label><div className="inp-wrap">
            <MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
          </div></div>
          <p className="note">Придёт на счёт и уменьшит «долг мне». Капитал не изменится — деньги просто вернулись из долга в кэш.</p>
          <button className="mainbtn" disabled={busy || !accId} onClick={save}>{busy ? 'Проведение…' : 'Получить'}</button>
        </>
      )}
    </Sheet>
  )
}

export function TopUpSheet({ asset, onClose, onDone }: { asset: Asset; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accId, setAccId] = useState<number | null>(null) // null = внешние деньги
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getAccounts().then((a) => { setAccounts(a); if (a.length) setAccId((a.find((x) => x.isSalary) ?? a[0]).id) })
  }, [])

  async function save() {
    const amt = parseFloat(amount)
    if (!Number.isFinite(amt) || amt <= 0) return
    setBusy(true)
    try { await topupDeposit(asset.id, amt, accId ?? undefined); onDone() } finally { setBusy(false) }
  }

  return (
    <Sheet title="Пополнить вклад" subtitle={asset.name} onClose={onClose}>
      <div className="fld"><label>Сумма пополнения ({asset.currency})</label><div className="inp-wrap">
        <MoneyInput className="inp big" placeholder="0" value={amount} onChange={setAmount} />
      </div></div>
      {accounts && accounts.length > 0 && (
        <div className="fld"><label>Откуда деньги</label><div className="seg wrap">
          {accounts.map((a) => (
            <button key={a.id} type="button" className={a.id === accId ? 'on' : ''} onClick={() => setAccId(a.id)}>{a.name}</button>
          ))}
          <button type="button" className={accId === null ? 'on' : ''} onClick={() => setAccId(null)}>Внешние</button>
        </div></div>
      )}
      <p className="note">
        {accId === null
          ? 'Деньги извне — просто добавятся к вкладу (капитал вырастет).'
          : 'Спишется с выбранного счёта и переедет во вклад — это перевод, а не трата: капитал не меняется, и норма капитализации не занижается.'}
        {' '}Накопленные проценты сохраняются.
      </p>
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Пополнение…' : 'Пополнить'}</button>
    </Sheet>
  )
}

function Row({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return (
    <div className="stat-r">
      <div className="stat-k">{k}</div>
      <div className={`stat-v ${cls ?? ''}`}>{v}</div>
    </div>
  )
}

export function debtNote(a: Asset, outstanding: number, cur: string): string {
  const scheme = a.debtScheme || 'accruing'
  if (scheme === 'annuity' || scheme === 'differentiated') {
    return 'Платёж идёт по графику — остаток уменьшается автоматически. Досрочно гасите — просто уменьшите остаток вручную.'
  }
  if (scheme === 'interestfree' || a.ratePercent === 0) {
    return 'Без процентов — уменьшайте остаток вручную по мере погашения.'
  }
  const perDay = (outstanding * a.ratePercent) / 100 / 365
  return `Остаток растёт примерно на ${money(perDay, cur)} в день по ставке ${a.ratePercent}%. Нажми «Внести платёж» — приложение само уменьшит остаток и продолжит начисление, вручную обновлять ничего не нужно.`
}

export function badgeLine(a: Asset): string {
  const meta = KIND_META[(a.kind as keyof typeof KIND_META)] ?? KIND_META.cash
  if (a.kind === 'realestate') return `${meta.label} · ${a.status === 'rented' ? 'сдаётся' : 'своё'}`
  if (a.kind === 'investment' && a.subtype) return `${meta.label} · ${SUBTYPE_LABEL[a.subtype] ?? ''}`.trim()
  if (a.kind === 'debt') return a.ratePercent > 0 ? `Кредит · ${a.ratePercent}% годовых` : 'Долг · без процентов'
  return meta.label
}
