import type { Overview } from '../api'
import { CURRENCIES, kindColor } from '../kinds'
import { money, signedMoney } from '../format'
import { HelperCard } from '../components/HelperCard'

export function Dashboard({
  overview,
  onOpenCategory,
  onOpenOptions,
  onOpenActivity,
  onChangeCurrency,
}: {
  overview: Overview
  onOpenCategory: (kind: string) => void
  onOpenOptions: () => void
  onOpenActivity: () => void
  onChangeCurrency: (currency: string) => void
}) {
  const cur = overview.baseCurrency
  const flowPositive = overview.monthlyFlow >= 0
  const empty = overview.categories.length === 0

  return (
    <div className="pad-screen">
      <div className="topbar row-between">
        <span>Обзор</span>
        <button className="icon-btn" onClick={onOpenActivity} aria-label="Действия" title="Действия">🕘</button>
      </div>

      <div className="ccy" role="group" aria-label="Валюта итога">
        {CURRENCIES.map((c) => (
          <button key={c} className={c === cur ? 'on' : ''} onClick={() => onChangeCurrency(c)}>
            {c}
          </button>
        ))}
      </div>

      <HelperCard />

      <div className="eyebrow">Чистый капитал</div>
      <div className="hero">{money(overview.netWorth, cur)}</div>
      <div className="rule" />

      <div className="splits">
        <div className="card">
          <div className="card-k"><span className="dot" style={{ background: 'var(--pos)' }} />Активы</div>
          <div className="card-v pos">{money(overview.assets, cur)}</div>
        </div>
        <div className="card">
          <div className="card-k"><span className="dot" style={{ background: 'var(--neg)' }} />Обязательства</div>
          <div className="card-v neg">{money(overview.liabilities, cur)}</div>
        </div>
      </div>

      <div className="flowrow">
        <div className="flow-k">Поток в месяц<small>доход − платежи по кредитам</small></div>
        <div className={`flow-v ${flowPositive ? 'pos' : 'neg'}`}>{signedMoney(overview.monthlyFlow, cur)}</div>
      </div>

      {overview.composition.length > 0 && (
        <div className="comp">
          <div className="compbar">
            {overview.composition.map((s) => (
              <span key={s.kind} style={{ width: `${s.percent}%`, background: kindColor(s.kind) }} />
            ))}
          </div>
          <div className="clegend">
            {overview.composition.map((s) => (
              <div key={s.kind}>
                <i style={{ background: kindColor(s.kind) }} />
                {s.label} {Math.round(s.percent)}%
              </div>
            ))}
          </div>
        </div>
      )}

      {overview.categories.map((cat) => (
        <button key={cat.kind} className="catrow" onClick={() => onOpenCategory(cat.kind)}>
          <span className="catrow-mark" style={{ background: kindColor(cat.kind) }} />
          <span className="catrow-name">
            {cat.label}
            <small>{cat.count} {cat.count === 1 ? 'позиция' : 'позиций'}</small>
          </span>
          <span className="catrow-sum">{cat.isLiability ? '−' : ''}{money(cat.subtotalBase, cur)}</span>
          <span className="chev">›</span>
        </button>
      ))}

      {overview.options > 0 && (
        <button className="opt-card" onClick={onOpenOptions}>
          <div className="opt-card-top">
            <span className="opt-card-mark" style={{ background: kindColor('options') }} />
            <span className="opt-card-name">Опционы</span>
            <span className="chev">›</span>
          </div>
          <div className="opt-card-params">
            <div><span className="k">Общая сумма</span><span className="v">{money(overview.options, cur)}</span></div>
            <div><span className="k">Уже мои</span><span className="v pos">{money(overview.optionsVested, cur)}</span></div>
          </div>
          <div className="opt-card-cap">Ещё зреет: {money(overview.options - overview.optionsVested, cur)}</div>
        </button>
      )}

      {empty && (
        <p className="muted empty">
          Пока пусто. Нажмите «＋» внизу и добавьте первый актив — квартиру, машину или вклад.
        </p>
      )}
    </div>
  )
}
