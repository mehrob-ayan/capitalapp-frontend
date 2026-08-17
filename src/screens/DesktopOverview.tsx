import { useEffect, useMemo, useState } from 'react'
import {
  getHistory, getActivity, getGoals, getOptions, getRates,
  type Overview, type Asset, type History, type Activity, type Goal, type OptionsList,
} from '../api'
import { DEBT_SCHEMES, KIND_META, kindColor } from '../kinds'
import { money, signedMoney, duration } from '../format'
import { CapitalChart, GoalRing, signedPct, activityDot, compactDate } from './desktop/shared'

const PERIODS: [string, string][] = [['1m', '1М'], ['6m', '6М'], ['1y', '1Г'], ['all', 'Всё']]
const PERIOD_LABEL: Record<string, string> = { '1m': 'за месяц', '6m': 'за полгода', '1y': 'за год', all: 'за всё время' }

const nf1 = (n: number) => (Math.round(Math.abs(n) * 10) / 10).toString().replace('.', ',')
const sharePct = (p?: number) => (p && p > 0 ? `${nf1(p)}%` : '—')
const schemeLabel = (s?: string) => DEBT_SCHEMES.find((d) => d.value === s)?.label ?? 'кредит'

function categoryYield(kind: string, assets: Asset[]): number | null {
  let wsum = 0
  let w = 0
  for (const a of assets) {
    if (a.kind !== kind) continue
    const v = Math.abs(a.metrics.valueBase || 0)
    const y = a.metrics.cagrPercent || a.metrics.cashYieldPercent || 0
    if (v > 0 && y !== 0) { wsum += y * v; w += v }
  }
  return w > 0 ? wsum / w : null
}

export interface DesktopOverviewProps {
  overview: Overview
  assets: Asset[]
  onOpenCategory: (kind: string) => void
  onOpenAsset: (id: number) => void
  onOpenAccounts: () => void
  onOpenOptions: () => void
  onOpenGoals: () => void
  onOpenActivity: () => void
}

export function DesktopOverview(props: DesktopOverviewProps) {
  const { overview, assets } = props
  const base = overview.baseCurrency

  const [period, setPeriod] = useState('1y')
  const [sort, setSort] = useState<'sum' | 'yield'>('sum')
  const [history, setHistory] = useState<History | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [options, setOptions] = useState<OptionsList | null>(null)
  const [rates, setRates] = useState<Record<string, number>>({})

  useEffect(() => { void getHistory(period).then(setHistory) }, [period, base])
  useEffect(() => {
    void getActivity().then((a) => setActivity(a.items))
    void getGoals().then(setGoals)
    void getOptions().then(setOptions)
    void getRates().then(setRates)
  }, [base])

  const goal = goals[0]
  const goalBase = useMemo(() => {
    if (!goal) return undefined
    const from = rates[goal.currency]
    const to = rates[base]
    if (!from || !to) return goal.currency === base ? goal.targetAmount : undefined
    return (goal.targetAmount * from) / to
  }, [goal, rates, base])

  const payables = useMemo(
    () => assets
      .filter((a) => a.kind === 'debt' && a.metrics.loan && a.metrics.loan.monthlyPayment > 0)
      .sort((a, b) => (b.metrics.loan!.outstanding || 0) - (a.metrics.loan!.outstanding || 0)),
    [assets],
  )

  const rows = useMemo(() => {
    const enriched = overview.categories.map((c) => ({
      ...c,
      share: overview.composition.find((s) => s.kind === c.kind)?.percent,
      yield: categoryYield(c.kind, assets),
    }))
    enriched.sort((a, b) =>
      sort === 'yield' ? (b.yield ?? -Infinity) - (a.yield ?? -Infinity) : Math.abs(b.subtotalBase) - Math.abs(a.subtotalBase))
    return enriched
  }, [overview.categories, overview.composition, assets, sort])

  const positions = overview.categories.reduce((n, c) => n + c.count, 0)
  const nextVest = options?.grants.filter((g) => g.status !== 'vested').map((g) => g.vestDate).sort()[0]

  return (
    <div className="dt-grid c-rail">
      <div className="dt-main-col dt-scrollcol">
        <section className="dt-card dt-cap">
          <div className="dt-cap-top">
            <div className="dt-cap-l">
              <div className="eyebrow">Чистый капитал</div>
              <div className="dt-cap-hero">{money(overview.netWorth, base)}</div>
              <div className="dt-cap-rule" />
              {history && (
                <div className={`dt-cap-delta ${history.changeAbs >= 0 ? 'pos' : 'neg'}`}>
                  {history.changeAbs >= 0 ? '▲' : '▼'} {signedMoney(history.changeAbs, base)} · {signedPct(history.changePercent)}
                  <span className="dt-cap-per"> {PERIOD_LABEL[period]}</span>
                </div>
              )}
            </div>
            <div className="dt-cap-r">
              <div className="dt-chips">
                {PERIODS.map(([v, l]) => (
                  <button key={v} className={v === period ? 'on' : ''} onClick={() => setPeriod(v)}>{l}</button>
                ))}
              </div>
              <CapitalChart points={history?.points ?? []} goal={goalBase} viewH={168} />
            </div>
          </div>

          <div className="dt-metrics">
            <Metric label="Активы" dot="var(--pos)" cls="pos" value={money(overview.assets, base)} />
            <Metric label="Обязательства" dot="var(--neg)" cls="neg" value={money(overview.liabilities, base)} />
            <Metric label="Поток в месяц" cls={overview.monthlyFlow >= 0 ? 'pos' : 'neg'} value={signedMoney(overview.monthlyFlow, base)} sub="доход − платежи по кредитам" />
            <Metric label="Проценты по кредиту" cls="neg" value={history && history.dailyInterest > 0 ? `−${money(history.dailyInterest, base)}/дн` : '—'} sub="капает каждый день" />
          </div>
        </section>

        <section className="dt-card dt-comp">
          <div className="dt-comp-head">
            <div className="dt-comp-ttl">Состав капитала</div>
            <div className="dt-comp-cnt">{positions} {positions === 1 ? 'позиция' : 'позиций'} в {overview.categories.length} категориях</div>
            <div className="dt-spacer" />
            <span className="dt-sortlbl">Сортировка:</span>
            <div className="dt-chips sm">
              <button className={sort === 'sum' ? 'on' : ''} onClick={() => setSort('sum')}>по сумме</button>
              <button className={sort === 'yield' ? 'on' : ''} onClick={() => setSort('yield')}>по доходности</button>
            </div>
          </div>

          <div className="dt-compbar">
            {overview.composition.map((s) => <span key={s.kind} style={{ width: `${s.percent}%`, background: kindColor(s.kind) }} />)}
          </div>

          <div className="dt-thead dt-comp-grid">
            <span>Категория</span><span className="r">Позиций</span><span className="r">Сумма</span>
            <span className="r">Доля</span><span className="r">Доходность</span><span />
          </div>
          <div className="dt-tbody">
            {rows.map((r) => (
              <button key={r.kind} className="dt-trow dt-comp-grid" onClick={() => props.onOpenCategory(r.kind)}>
                <span className="dt-tc-name"><i style={{ background: kindColor(r.kind) }} />{r.label}</span>
                <span className="r muted">{r.count}</span>
                <span className="r num">{r.isLiability ? '−' : ''}{money(r.subtotalBase, base)}</span>
                <span className="r muted">{r.isLiability ? '—' : sharePct(r.share)}</span>
                <span className={`r yld ${r.yield == null ? 'muted' : r.yield >= 0 ? 'pos' : 'neg'}`}>{r.yield == null ? '—' : signedPct(r.yield)}</span>
                <span className="dt-chev">›</span>
              </button>
            ))}
            {rows.length === 0 && <p className="muted" style={{ padding: '14px 0' }}>Пока пусто. Добавь первый актив кнопкой «Добавить».</p>}
          </div>
        </section>
      </div>

      <div className="dt-rail">
        <section className="dt-card dt-rc">
          <div className="dt-rc-head"><span>Ближайшие платежи</span><button className="dt-link" onClick={props.onOpenAccounts}>Все</button></div>
          {payables.length === 0 && <p className="muted dt-rc-empty">Нет предстоящих платежей по кредитам.</p>}
          {payables.slice(0, 3).map((a) => {
            const loan = a.metrics.loan!
            return (
              <button key={a.id} className="dt-pay" onClick={() => props.onOpenAsset(a.id)}>
                <span className="dt-pay-ic" style={{ background: kindColor('debt') }}>{KIND_META.debt.letter}</span>
                <span className="dt-pay-main">
                  <span className="dt-pay-nm">{a.name}</span>
                  <span className="dt-pay-sub">{schemeLabel(a.debtScheme)} · осталось {duration(loan.remainingMonths)}</span>
                </span>
                <span className="dt-pay-amt">
                  <span className="num">{money(loan.monthlyPayment, a.currency)}</span>
                  {loan.principalPart > 0 && <span className="dt-pay-body">тело {money(loan.principalPart, a.currency)}</span>}
                </span>
              </button>
            )
          })}
          {payables.length > 0 && <button className="dt-rc-btn" onClick={() => props.onOpenAsset(payables[0].id)}>Отметить платёж</button>}
        </section>

        {goal && (
          <section className="dt-card dt-rc dt-goal">
            <GoalRing percent={goal.progressPercent} />
            <div className="dt-goal-tx">
              <div className="dt-goal-ttl">Цель: {money(goal.targetAmount, goal.currency)}</div>
              <div className="dt-goal-cur">{money(goal.currentAmount, goal.currency)}</div>
              <div className="dt-goal-fc">
                {goal.monthsToGoal != null ? `при текущем потоке — примерно ${duration(goal.monthsToGoal)}` : 'добавь ежемесячный взнос, чтобы увидеть прогноз'}
              </div>
            </div>
          </section>
        )}

        {options && options.totalBase > 0 && (
          <section className="dt-card dt-rc">
            <div className="dt-rc-head"><span>Опционы</span><button className="dt-link" onClick={props.onOpenOptions}>Подробно</button></div>
            <div className="dt-opt-grid">
              <div><span className="dt-opt-k">Общая сумма</span><span className="dt-opt-v">{money(options.totalBase, base)}</span></div>
              <div><span className="dt-opt-k">Уже мои</span><span className="dt-opt-v pos">{money(options.vestedBase, base)}</span></div>
            </div>
            <div className="dt-vest"><span style={{ width: `${Math.min(100, (options.vestedBase / options.totalBase) * 100)}%` }} /></div>
            <div className="dt-opt-cap">
              Ещё зреет: {money(options.totalBase - options.vestedBase, base)}
              {nextVest ? ` · ближайший вестинг ${compactDate(nextVest)}` : ''}
            </div>
          </section>
        )}

        <section className="dt-card dt-rc dt-act">
          <div className="dt-rc-head"><span>Что изменилось</span><button className="dt-link" onClick={props.onOpenActivity}>История</button></div>
          <div className="dt-feed">
            {activity.length === 0 && <p className="muted dt-rc-empty">Пока нет событий.</p>}
            {activity.map((a) => (
              <div key={a.id} className="dt-ev">
                <span className="dt-ev-dot" style={{ background: activityDot(a.kind) }} />
                <span className="dt-ev-main">
                  <span className="dt-ev-ttl">{a.title}</span>
                  <span className="dt-ev-sub">{a.detail}</span>
                </span>
                {a.changeAbs !== 0 && <span className={`dt-ev-amt ${a.changeAbs >= 0 ? 'pos' : 'neg'}`}>{signedMoney(a.changeAbs, base)}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, dot, cls, value, sub }: { label: string; dot?: string; cls?: string; value: string; sub?: string }) {
  return (
    <div className="dt-metric">
      <div className="dt-metric-k">{dot && <span className="dt-metric-dot" style={{ background: dot }} />}{label}</div>
      <div className={`dt-metric-v ${cls ?? ''}`}>{value}</div>
      {sub && <div className="dt-metric-s">{sub}</div>}
    </div>
  )
}
