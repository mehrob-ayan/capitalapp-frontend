import { useEffect, useState } from 'react'
import { getGoals, type Goal } from '../api'
import { money, duration } from '../format'
import { Ring } from '../components/Ring'
import { GoalForm } from './GoalForm'

export function Goals() {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [form, setForm] = useState<{ existing?: Goal } | null>(null)

  const load = () => { void getGoals().then(setGoals) }
  useEffect(load, [])

  return (
    <div className="pad-screen">
      <div className="topbar">Цели</div>

      {!goals && <p className="muted">Загрузка…</p>}

      {goals && goals.length === 0 && (
        <p className="muted empty">Целей пока нет. Поставьте цель по капиталу — увидите прогресс и срок.</p>
      )}

      {goals?.map((g) => (
        <button key={g.id} className="goal-card" onClick={() => setForm({ existing: g })}>
          <Ring percent={g.progressPercent} />
          <span className="goal-tx">
            <span className="goal-t">{g.title}</span>
            <span className="goal-v">
              {money(g.currentAmount, g.currency)} <span className="goal-target">/ {money(g.targetAmount, g.currency)}</span>
            </span>
            <span className="goal-sub">{etaLine(g)}</span>
          </span>
        </button>
      ))}

      {goals && (
        <button className="tile add-goal" onClick={() => setForm({})}>
          <b>＋ Новая цель</b>
        </button>
      )}

      {form && <GoalForm existing={form.existing} onCancel={() => setForm(null)} onSaved={() => { setForm(null); load() }} />}
    </div>
  )
}

function etaLine(g: Goal): string {
  if (g.monthsToGoal === 0) return 'Цель достигнута'
  if (g.monthsToGoal && g.monthsToGoal > 0) {
    return `При +${money(g.monthlyContribution, g.currency)}/мес — примерно через ${duration(g.monthsToGoal)}`
  }
  return `Осталось ${money(g.remaining, g.currency)}`
}
