import type { Asset } from '../../api'
import { KIND_META, kindColor, type Kind } from '../../kinds'
import { money, percent, monthYear } from '../../format'

const SUBTYPE_LABEL: Record<string, string> = { stock: 'Акции', bond: 'Облигации', fund: 'Фонд' }

function itemSub(a: Asset): string {
  const parts: string[] = []
  if (a.currency) parts.push(a.currency)
  if (a.kind === 'investment' && a.subtype) parts.push(SUBTYPE_LABEL[a.subtype] ?? a.subtype)
  if (a.kind === 'deposit' && a.ratePercent) parts.push(`${a.ratePercent}% годовых`)
  if ((a.kind === 'investment' || a.kind === 'realestate' || a.kind === 'car' || a.kind === 'metals') && a.invested > 0) parts.push(percent(a.metrics.profitPercent))
  if (a.kind === 'debt') parts.push(a.ratePercent > 0 ? `${a.ratePercent}% годовых` : 'без %')
  return parts.join(' · ')
}

export function DesktopCategory({ kind, assets, base, onOpenAsset, onOpenAccount, onAdd }: {
  kind: Kind
  assets: Asset[]
  base: string
  onOpenAsset: (id: number) => void
  onOpenAccount: (id: number) => void
  onAdd: (kind: Kind) => void
}) {
  const meta = KIND_META[kind]
  const items = assets.filter((a) => a.kind === kind)
  const isLiability = meta.isLiability ?? false
  const subtotal = items.reduce((s, a) => s + (isLiability ? a.metrics.liabilityBase : a.metrics.valueBase), 0)
  const totalProfit = items.reduce((s, a) => s + a.metrics.profitBase, 0)
  const invested = items.reduce((s, a) => s + a.invested, 0)
  const monthly = items.reduce((s, a) => s + a.monthlyIncome, 0)

  return (
    <div className="dt-grid c-one">
      <section className="dt-card dt-pad dt-cat-head">
        <div>
          <div className="eyebrow">{isLiability ? 'Всего долг' : 'Всего в категории'}</div>
          <div className="dt-cap-hero sm">{isLiability ? '−' : ''}{money(subtotal, base)}</div>
          <div className="dt-cat-sub">
            {items.length} {items.length === 1 ? 'позиция' : 'позиций'}
            {totalProfit !== 0 && !isLiability && (
              <span className={totalProfit >= 0 ? 'pos' : 'neg'}> · {totalProfit >= 0 ? '+' : '−'}{money(Math.abs(totalProfit), base)} прибыль</span>
            )}
          </div>
        </div>
        <div className="dt-spacer" />
        {!isLiability && (
          <div className="dt-cat-metrics">
            {invested > 0 && <div><span>Вложено</span><b>{money(invested, base)}</b></div>}
            {monthly > 0 && <div><span>Доход в месяц</span><b>{money(monthly, base)}</b></div>}
          </div>
        )}
        <button className="dt-btn-brand" onClick={() => onAdd(kind)}>＋ Добавить</button>
      </section>

      <section className="dt-card dt-pad dt-act">
        <div className="dt-thead dt-cat-grid">
          <span>Позиция</span><span className="r">Стоит сейчас</span><span className="r">Вложено</span>
          <span className="r">Прибыль</span><span className="r">В месяц</span><span className="r">Куплено</span><span />
        </div>
        <div className="dt-tbody">
          {items.map((a) => (
            <button key={a.id} className="dt-trow dt-cat-grid" onClick={() => (a.isAccount ? onOpenAccount(a.id) : onOpenAsset(a.id))}>
              <span className="dt-tc-name">
                <span className="dt-li-ic" style={{ background: kindColor(a.kind) }}>{meta.letter}</span>
                <span className="dt-li-tx"><b>{a.name}</b><small>{itemSub(a)}</small></span>
              </span>
              <span className={`r num ${isLiability ? 'neg' : ''}`}>{isLiability ? '−' : ''}{money(isLiability ? a.metrics.liabilityBase : a.metrics.valueBase, base)}</span>
              <span className="r muted">{a.invested > 0 ? money(a.invested, base) : '—'}</span>
              <span className={`r ${a.metrics.profitBase > 0 ? 'pos' : a.metrics.profitBase < 0 ? 'neg' : 'muted'}`}>{a.invested > 0 ? `${a.metrics.profitBase >= 0 ? '+' : '−'}${money(Math.abs(a.metrics.profitBase), base)}` : '—'}</span>
              <span className="r muted">{a.monthlyIncome > 0 ? money(a.monthlyIncome, base) : '—'}</span>
              <span className="r muted">{a.purchaseDate ? monthYear(a.purchaseDate) : '—'}</span>
              <span className="dt-chev">›</span>
            </button>
          ))}
          {items.length === 0 && <p className="muted" style={{ padding: '14px 0' }}>Пусто. Добавь первую позицию.</p>}
        </div>
      </section>
    </div>
  )
}
