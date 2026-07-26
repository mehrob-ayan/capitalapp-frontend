import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { CURRENCIES } from '../kinds'
import { symbol } from '../format'
import { createGoal, updateGoal, deleteGoal, type Goal } from '../api'

export function GoalForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing?: Goal
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD')
  const [target, setTarget] = useState(existing ? String(existing.targetAmount) : '')
  const [monthly, setMonthly] = useState(existing?.monthlyContribution ? String(existing.monthlyContribution) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const targetAmount = parseFloat(target)
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError('Укажите сумму цели')
      return
    }
    setBusy(true)
    setError(null)
    const input = {
      title: title.trim() || 'Цель по капиталу',
      targetAmount,
      currency,
      monthlyContribution: parseFloat(monthly) || 0,
    }
    try {
      if (existing) await updateGoal(existing.id, input)
      else await createGoal(input)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing || !window.confirm('Удалить цель?')) return
    setBusy(true)
    try {
      await deleteGoal(existing.id)
      onSaved()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Sheet title={existing ? 'Изменить цель' : 'Новая цель'} subtitle="Цель по капиталу" onClose={onCancel}>
      <div className="fld">
        <label>Название</label>
        <div className="inp-wrap">
          <input className="inp" type="text" placeholder="Напр. капитал 20 млн" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="fld">
        <label>Валюта</label>
        <div className="seg">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="fld">
        <label>Сумма цели</label>
        <div className="inp-wrap">
          <span className="inp-pre">{symbol(currency)}</span>
          <input className="inp big" type="number" inputMode="decimal" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
      </div>

      <div className="fld">
        <label>Откладываю в месяц <span className="hint">· для прогноза срока</span></label>
        <div className="inp-wrap">
          <span className="inp-pre">{symbol(currency)}</span>
          <input className="inp big" type="number" inputMode="decimal" placeholder="0" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : existing ? 'Сохранить' : 'Добавить'}</button>
      {existing && <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить цель</button>}
    </Sheet>
  )
}
