import { useEffect, useState } from 'react'
import { getGoals, type Goal } from '../../api'
import { money, duration } from '../../format'
import { GoalForm } from '../GoalForm'
import { GoalRing } from './shared'

function etaLine(g: Goal): string {
  if (g.monthsToGoal === 0) return 'Цель достигнута'
  if (g.monthsToGoal && g.monthsToGoal > 0) return `При +${money(g.monthlyContribution, g.currency)}/мес — примерно через ${duration(g.monthsToGoal)}`
  return `Осталось ${money(g.remaining, g.currency)}`
}

export function DesktopGoals() {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [form, setForm] = useState<{ existing?: Goal } | null>(null)
  const load = () => void getGoals().then(setGoals)
  useEffect(load, [])

  return (
    <div className="dt-scrollcol dt-full">
      <div className="dt-cards-grid">
        {goals?.map((g) => (
          <button key={g.id} className="dt-card dt-goalcard" onClick={() => setForm({ existing: g })}>
            <div className="dt-goalcard-top">
              <GoalRing percent={g.progressPercent} />
              <div className="dt-goalcard-tx">
                <div className="dt-goalcard-t">{g.title}</div>
                <div className="dt-goalcard-v">{money(g.currentAmount, g.currency)}</div>
                <div className="dt-goalcard-of">из {money(g.targetAmount, g.currency)}</div>
              </div>
            </div>
            <div className="dt-goalcard-eta">{etaLine(g)}</div>
          </button>
        ))}
        {goals && <button className="dt-card dt-newcard" onClick={() => setForm({})}>＋ Новая цель</button>}
        {!goals && <p className="muted">Загрузка…</p>}
      </div>
      {form && <GoalForm existing={form.existing} onCancel={() => setForm(null)} onSaved={() => { setForm(null); load() }} />}
    </div>
  )
}
