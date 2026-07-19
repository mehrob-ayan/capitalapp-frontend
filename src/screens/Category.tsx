import type { Asset } from '../api'
import { KIND_META, kindColor, type Kind } from '../kinds'
import { money, percent } from '../format'
import { TopBar } from '../components/TopBar'

const SUBTYPE_LABEL: Record<string, string> = { stock: 'Акции', bond: 'Облигации', fund: 'Фонд' }

export function Category({
  kind,
  assets,
  baseCurrency,
  onBack,
  onOpenAsset,
  onAdd,
}: {
  kind: Kind
  assets: Asset[]
  baseCurrency: string
  onBack: () => void
  onOpenAsset: (id: number) => void
  onAdd: (kind: Kind) => void
}) {
  const meta = KIND_META[kind]
  const items = assets.filter((a) => a.kind === kind)
  const isLiability = meta.isLiability ?? false
  const subtotal = items.reduce((s, a) => s + (isLiability ? a.metrics.liabilityBase : a.metrics.valueBase), 0)
  const totalProfit = items.reduce((s, a) => s + a.metrics.profitBase, 0)

  return (
    <div className="pad-screen with-back">
      <TopBar title={meta.label} onBack={onBack} />

      <div className="eyebrow">{isLiability ? 'Всего долг' : 'Всего в категории'}</div>
      <div className="hero small">{isLiability ? '−' : ''}{money(subtotal, baseCurrency)}</div>
      <div className="cat-sub">
        {items.length} {items.length === 1 ? 'позиция' : 'позиций'}
        {totalProfit !== 0 && !isLiability && (
          <span className={totalProfit >= 0 ? 'pos' : 'neg'}> · {totalProfit >= 0 ? '+' : '−'}{money(Math.abs(totalProfit), baseCurrency)} прибыль</span>
        )}
      </div>
      <div className="rule" />

      <div className="list">
        {items.map((a) => (
          <button key={a.id} className="li" onClick={() => onOpenAsset(a.id)}>
            <span className="li-mark" style={{ background: kindColor(a.kind) }}>{meta.letter}</span>
            <span className="li-main">
              <span className="li-name">{a.name}</span>
              <span className="li-sub">{itemSub(a)}</span>
            </span>
            <span className="li-amt">
              <span className={`li-a ${isLiability ? 'neg' : ''}`}>{isLiability ? '−' : ''}{money(isLiability ? a.metrics.liabilityBase : a.metrics.valueBase, baseCurrency)}</span>
              {a.currency !== baseCurrency && <span className="li-o">{money(a.value, a.currency)}</span>}
            </span>
          </button>
        ))}
      </div>

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
  return parts.join(' · ')
}
