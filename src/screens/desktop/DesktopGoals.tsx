import { useEffect, useState } from 'react'
import { getGoals, getRates, getMe, type Goal } from '../../api'
import { money, duration, monthYear } from '../../format'
import { GoalForm } from '../GoalForm'
import { GoalRing } from './shared'

// Aggregate analytics across all goals, converted to the display currency.
function GoalsSummary({ goals, base, rates, incomeBase }: {
  goals: Goal[]; base: string; rates: Record<string, number>; incomeBase: number
}) {
  const conv = (amt: number, cur: string) => (rates[cur] && rates[base] ? (amt * rates[cur]) / rates[base] : 0)
  // Accumulation metrics (saved / left to save) cover savings goals only —
  // paying off a debt isn't "saving". The monthly plan, however, is the real
  // cash outflow, so it includes debt-payoff goals too.
  const savings = goals.filter((g) => g.goalKind !== 'debt')
  const active = savings.filter((g) => g.monthsToGoal !== 0)
  const done = savings.length - active.length
  const remaining = active.reduce((s, g) => s + conv(g.remaining, g.currency), 0)
  const saved = savings.reduce((s, g) => s + conv(g.currentAmount, g.currency), 0)
  const monthly = goals.filter((g) => g.monthsToGoal !== 0)
    .reduce((s, g) => s + conv(g.monthlyContribution, g.currency), 0)
  const pct = incomeBase > 0 ? Math.round((monthly / incomeBase) * 100) : null
  const paced = active.filter((g) => g.monthsToGoal && g.monthsToGoal > 0)
  const nearest = paced.slice().sort((a, b) => (a.monthsToGoal ?? 0) - (b.monthsToGoal ?? 0))[0]
  const farthest = paced.slice().sort((a, b) => (b.monthsToGoal ?? 0) - (a.monthsToGoal ?? 0))[0]
  const debtCount = goals.filter((g) => g.goalKind === 'debt').length

  return (
    <section className="dt-card dt-pad dt-goals-sum">
      <div className="dt-card-head"><span className="dt-card-ttl">Сводка по накоплениям</span>
        <span className="dt-hint">{active.length} активных{done > 0 ? ` · ${done} достигнуто` : ''}</span>
      </div>
      <div className="dt-goals-kpis">
        <div className="dt-kpi"><span>Уже накоплено</span><b className="pos">{money(saved, base)}</b></div>
        <div className="dt-kpi"><span>Осталось накопить</span><b>{money(remaining, base)}</b></div>
        <div className="dt-kpi">
          <span>План в месяц</span>
          <b className={pct != null && pct > 100 ? 'neg' : ''}>{money(monthly, base)}{pct != null && <small> · {pct}% дохода</small>}</b>
        </div>
      </div>
      {pct != null && pct > 100 && (
        <p className="note neg-note">⚠ Суммарные планы ({money(monthly, base)}/мес) выше твоего дохода ({money(incomeBase, base)}/мес) — все цели одновременно не потянуть.</p>
      )}
      {nearest && (
        <p className="note">Ближайшая: <b>{nearest.title}</b> — {duration(nearest.monthsToGoal ?? 0)}{nearest.targetDate ? ` (к ${monthYear(nearest.targetDate)})` : ''}.
          {farthest && farthest !== nearest && <> Самая дальняя: <b>{farthest.title}</b> — {duration(farthest.monthsToGoal ?? 0)}.</>}
        </p>
      )}
      {debtCount > 0 && <p className="note">Долги-цели ({debtCount}) не входят в «накоплено» и «осталось» (это погашение, не накопление), но входят в «план в месяц» — это реальный ежемесячный отток.</p>}
    </section>
  )
}

function etaLine(g: Goal): string {
  if (g.monthsToGoal === 0) return 'Цель достигнута 🎉'
  if (g.monthsToGoal && g.monthsToGoal > 0) {
    const when = g.targetDate ? ` · к ${monthYear(g.targetDate)}` : ''
    return `Осталось ${money(g.remaining, g.currency)} · при +${money(g.monthlyContribution, g.currency)}/мес ≈ ${duration(g.monthsToGoal)}${when}`
  }
  return `Осталось ${money(g.remaining, g.currency)} · задай план в месяц для прогноза`
}

function Badges({ g }: { g: Goal }) {
  const b: { txt: string; cls: string }[] = []
  if (g.monthsToGoal === 0) b.push({ txt: g.goalKind === 'debt' ? '✓ закрыт' : '🎉 достигнута', cls: 'ok' })
  else if (g.exceeded) b.push({ txt: '🎉 цель превышена', cls: 'ok' })
  if (g.overIncome) b.push({ txt: '⚠ план выше зарплаты', cls: 'warn' })
  if (g.goalKind === 'debt') b.push({ txt: 'долг', cls: 'dim' })
  if (!b.length) return null
  return <div className="dt-goal-badges">{b.map((x, i) => <span key={i} className={`dt-goal-badge ${x.cls}`}>{x.txt}</span>)}</div>
}

export function DesktopGoals({ base = 'USD', onOpenAsset }: { base?: string; onOpenAsset?: (id: number) => void }) {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [incomeBase, setIncomeBase] = useState(0)
  const [form, setForm] = useState<{ existing?: Goal } | null>(null)
  const load = () => void getGoals().then(setGoals)
  useEffect(load, [])
  useEffect(() => {
    void Promise.all([getRates(), getMe()]).then(([r, u]) => {
      setRates(r)
      const inc = u.monthlyIncome ?? 0, cur = u.incomeCurrency || 'USD'
      setIncomeBase(inc > 0 && r[cur] && r[base] ? (inc * r[cur]) / r[base] : 0)
    })
  }, [base])

  const openGoal = (g: Goal) => {
    if (g.goalKind === 'debt' && g.linkedAssetId != null) onOpenAsset?.(g.linkedAssetId)
    else setForm({ existing: g })
  }

  return (
    <div className="dt-scrollcol dt-full">
      {goals && goals.length > 0 && <GoalsSummary goals={goals} base={base} rates={rates} incomeBase={incomeBase} />}
      <div className="dt-cards-grid">
        {goals?.map((g) => {
          const isDebt = g.goalKind === 'debt'
          return (
            <button key={`${g.goalKind}-${g.id}`} className={`dt-card dt-goalcard ${isDebt ? 'debt' : ''}`} onClick={() => openGoal(g)}>
              <div className="dt-goalcard-top">
                <GoalRing percent={g.progressPercent} />
                <div className="dt-goalcard-tx">
                  <div className="dt-goalcard-t">{g.title}{!isDebt && g.linkedAssetName && <span className="dt-goal-pot"> · {g.linkedAssetName}</span>}</div>
                  <div className="dt-goalcard-v">{money(g.currentAmount, g.currency)}</div>
                  <div className="dt-goalcard-of">{isDebt ? 'выплачено из' : 'из'} {money(g.targetAmount, g.currency)}</div>
                </div>
              </div>
              <Badges g={g} />
              <div className="dt-goalcard-eta">{etaLine(g)}</div>
              {g.monthlyContribution > 0 && (g.linkedAssetId != null || isDebt) && (
                <div className="dt-goal-month">
                  <div className="dt-goal-mbar"><i className={g.onTrack ? 'ok' : ''} style={{ width: `${Math.min(100, (g.contributedThisMonth / g.monthlyContribution) * 100)}%` }} /></div>
                  <div className="dt-goal-mlbl">
                    <span>В этом месяце: {money(g.contributedThisMonth, g.currency)} из {money(g.monthlyContribution, g.currency)}</span>
                    <span className={g.onTrack ? 'pos' : 'muted'}>{g.onTrack ? '✓ план выполнен' : 'ещё не добрал'}</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
        {goals && <button className="dt-card dt-newcard" onClick={() => setForm({})}>＋ Новая цель</button>}
        {!goals && <p className="muted">Загрузка…</p>}
      </div>
      {form && <GoalForm existing={form.existing} onCancel={() => setForm(null)} onSaved={() => { setForm(null); load() }} />}
    </div>
  )
}
