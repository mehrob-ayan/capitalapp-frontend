import { useEffect, useState } from 'react'
import { getAssetHistory, getAccounts, payDebt, getDebtPayments, type Asset, type AssetHistory, type Account, type AccountEntry } from '../api'
import { KIND_META, kindColor } from '../kinds'
import { money, percent, monthYear, duration, dateShort } from '../format'
import { TopBar } from '../components/TopBar'
import { AreaChart } from '../components/AreaChart'
import { Sheet } from '../components/Sheet'

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
  const meta = KIND_META[(asset.kind as keyof typeof KIND_META)] ?? KIND_META.cash
  const cur = asset.currency
  const isDebt = asset.kind === 'debt'
  const isDeposit = asset.kind === 'deposit'
  const loan = asset.metrics.loan
  const showValueChart = VALUE_CHART_KINDS.has(asset.kind)
  // Deposits accrue: the "value now" is the compounded balance, not the entered principal.
  const accrued = asset.metrics.accruedValue
  const depositInterest = isDeposit ? accrued - asset.value : 0

  const [history, setHistory] = useState<AssetHistory | null>(null)
  useEffect(() => {
    if (showValueChart) void getAssetHistory(asset.id).then(setHistory)
  }, [asset.id, showValueChart])

  const [payments, setPayments] = useState<AccountEntry[]>([])
  useEffect(() => {
    if (isDebt) void getDebtPayments(asset.id).then(setPayments)
  }, [asset.id, isDebt])

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

      <div className="eyebrow">{isDebt ? 'Остаток долга сегодня' : isDeposit ? 'Сумма сегодня' : 'Стоит сейчас'}</div>
      <div className={`hero small ${isDebt ? 'neg' : ''}`}>
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
                <Row k="Тело вклада" v={money(asset.value, cur)} />
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

      {isDebt && payments.length > 0 && (
        <>
          <label className="section-lbl">История платежей</label>
          <div className="list">
            {payments.map((p) => (
              <div className="li static" key={p.id}>
                <span className="li-main">
                  <span className="li-name">{p.note || 'Платёж'}</span>
                  <span className="li-sub">{dateShort(p.date)}</span>
                </span>
                <span className="li-amt"><span className="li-a neg">−{money(p.debtAmount ?? p.amount, cur)}</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {isDebt && <button className="mainbtn" onClick={() => setPaying(true)}>Внести платёж</button>}
      <button className={isDebt ? 'linkbtn' : 'mainbtn'} onClick={onEdit}>Изменить</button>
      <button className="linkbtn danger" onClick={onDelete}>Удалить</button>

      {paying && (
        <PaySheet asset={asset} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); onChanged?.(); onBack() }} />
      )}
    </div>
  )
}

function PaySheet({ asset, onClose, onPaid }: { asset: Asset; onClose: () => void; onPaid: () => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accId, setAccId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
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
            <input className="inp big" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div></div>
          <p className="note">Спишется со счёта и уменьшит долг. Капитал изменится только на проценты — тело долга переходит из денег в погашение.</p>
          <button className="mainbtn" disabled={busy || !accId} onClick={save}>{busy ? 'Проведение…' : 'Оплатить'}</button>
        </>
      )}
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

function debtNote(a: Asset, outstanding: number, cur: string): string {
  const scheme = a.debtScheme || 'accruing'
  if (scheme === 'annuity' || scheme === 'differentiated') {
    return 'Платёж идёт по графику — остаток уменьшается автоматически. Досрочно гасите — просто уменьшите остаток вручную.'
  }
  if (scheme === 'interestfree' || a.ratePercent === 0) {
    return 'Без процентов — уменьшайте остаток вручную по мере погашения.'
  }
  const perDay = (outstanding * a.ratePercent) / 100 / 365
  return `Остаток растёт примерно на ${money(perDay, cur)} в день по ставке ${a.ratePercent}%. Внесёте платёж — обновите остаток, и приложение продолжит начисление с новой суммы.`
}

function badgeLine(a: Asset): string {
  const meta = KIND_META[(a.kind as keyof typeof KIND_META)] ?? KIND_META.cash
  if (a.kind === 'realestate') return `${meta.label} · ${a.status === 'rented' ? 'сдаётся' : 'своё'}`
  if (a.kind === 'investment' && a.subtype) return `${meta.label} · ${SUBTYPE_LABEL[a.subtype] ?? ''}`.trim()
  if (a.kind === 'debt') return a.ratePercent > 0 ? `Кредит · ${a.ratePercent}% годовых` : 'Долг · без процентов'
  return meta.label
}
