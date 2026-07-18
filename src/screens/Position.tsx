import type { Asset } from '../api'
import { KIND_META, kindColor } from '../kinds'
import { money, percent, monthYear, duration } from '../format'
import { TopBar } from '../components/TopBar'

const SUBTYPE_LABEL: Record<string, string> = { stock: 'Акции', bond: 'Облигации', fund: 'Фонд' }

export function Position({
  asset,
  onBack,
  onEdit,
  onDelete,
}: {
  asset: Asset
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = KIND_META[(asset.kind as keyof typeof KIND_META)] ?? KIND_META.cash
  const cur = asset.currency
  const isDebt = asset.kind === 'debt'
  const loan = asset.metrics.loan

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

      <div className="eyebrow">{isDebt ? 'Остаток долга сегодня' : 'Стоит сейчас'}</div>
      <div className={`hero small ${isDebt ? 'neg' : ''}`}>
        {isDebt ? '−' : ''}{money(isDebt && loan ? loan.outstanding : asset.value, cur)}
      </div>
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

      <button className="mainbtn" onClick={onEdit}>Изменить</button>
      <button className="linkbtn danger" onClick={onDelete}>Удалить</button>
    </div>
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
