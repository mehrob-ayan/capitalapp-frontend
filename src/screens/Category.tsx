import { useState } from 'react'
import type { Asset } from '../api'
import { KIND_META, kindColor, type Kind } from '../kinds'
import { money, percent } from '../format'
import { TopBar } from '../components/TopBar'

const SUBTYPE_LABEL: Record<string, string> = { stock: 'Акции', bond: 'Облигации', fund: 'Фонд' }

// A debt is "closed" once its balance hits 0; a receivable ("долг мне") once
// fully repaid. Closed items move to a collapsed section instead of cluttering.
function isClosed(a: Asset): boolean {
  if (a.kind === 'debt') return (a.metrics.loan ? a.metrics.loan.outstanding : a.value) <= 0.5
  if (a.kind === 'lent') return a.value <= 0.5
  return false
}

export function Category({
  kind,
  assets,
  baseCurrency,
  onBack,
  onOpenAsset,
  onOpenAccount,
  onAdd,
}: {
  kind: Kind
  assets: Asset[]
  baseCurrency: string
  onBack: () => void
  onOpenAsset: (id: number) => void
  onOpenAccount?: (id: number) => void
  onAdd: (kind: Kind) => void
}) {
  const meta = KIND_META[kind]
  const all = assets.filter((a) => a.kind === kind)
  const active = all.filter((a) => !isClosed(a))
  const closed = all.filter(isClosed)
  const isLiability = meta.isLiability ?? false
  const subtotal = active.reduce((s, a) => s + (isLiability ? a.metrics.liabilityBase : a.metrics.valueBase), 0)
  const totalProfit = active.reduce((s, a) => s + a.metrics.profitBase, 0)
  const [showClosed, setShowClosed] = useState(false)

  const row = (a: Asset, dim = false) => (
    <button key={a.id} className={`li ${dim ? 'dim' : ''}`} onClick={() => (a.isAccount && onOpenAccount ? onOpenAccount(a.id) : onOpenAsset(a.id))}>
      <span className="li-mark" style={{ background: kindColor(a.kind) }}>{meta.letter}</span>
      <span className="li-main">
        <span className="li-name">{a.name}</span>
        <span className="li-sub">{dim ? 'Закрыт' : itemSub(a)}</span>
      </span>
      <span className="li-amt">
        <span className={`li-a ${dim ? '' : isLiability ? 'neg' : ''}`}>{dim ? '✓' : `${isLiability ? '−' : ''}${money(isLiability ? a.metrics.liabilityBase : a.metrics.valueBase, baseCurrency)}`}</span>
        {!dim && a.currency !== baseCurrency && <span className="li-o">{money(a.value, a.currency)}</span>}
      </span>
    </button>
  )

  return (
    <div className="pad-screen with-back">
      <TopBar title={meta.label} onBack={onBack} />

      <div className="eyebrow">{isLiability ? 'Всего долг' : 'Всего в категории'}</div>
      <div className="hero small">{isLiability ? '−' : ''}{money(subtotal, baseCurrency)}</div>
      <div className="cat-sub">
        {active.length} {active.length === 1 ? 'позиция' : 'позиций'}
        {totalProfit !== 0 && !isLiability && (
          <span className={totalProfit >= 0 ? 'pos' : 'neg'}> · {totalProfit >= 0 ? '+' : '−'}{money(Math.abs(totalProfit), baseCurrency)} прибыль</span>
        )}
      </div>
      <div className="rule" />

      {active.length > 0 && <div className="list">{active.map((a) => row(a))}</div>}
      {active.length === 0 && closed.length > 0 && <p className="muted">Все закрыты — активных нет.</p>}

      {closed.length > 0 && (
        <>
          <button className="closed-toggle" onClick={() => setShowClosed((v) => !v)}>
            {showClosed ? '▾' : '▸'} Закрытые ({closed.length})
          </button>
          {showClosed && <div className="list">{closed.map((a) => row(a, true))}</div>}
        </>
      )}

      <button className="mainbtn" onClick={() => onAdd(kind)}>Добавить</button>
    </div>
  )
}

function itemSub(a: Asset): string {
  const parts: string[] = []
  if (a.currency) parts.push(a.currency)
  if (a.kind === 'investment' && a.subtype) parts.push(SUBTYPE_LABEL[a.subtype] ?? a.subtype)
  if (a.kind === 'deposit' && a.ratePercent) parts.push(`${a.ratePercent}% годовых`)
  if ((a.kind === 'investment' || a.kind === 'realestate' || a.kind === 'car' || a.kind === 'metals') && a.invested > 0) {
    parts.push(`${percent(a.metrics.profitPercent)}`)
  }
  if (a.kind === 'debt') parts.push(a.ratePercent > 0 ? `${a.ratePercent}% годовых` : 'без %')
  if (a.excludeFromNetWorth) parts.push('вне капитала')
  return parts.join(' · ')
}
