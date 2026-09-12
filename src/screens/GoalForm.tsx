import { useEffect, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'
import { CURRENCIES } from '../kinds'
import { symbol } from '../format'
import { createGoal, updateGoal, deleteGoal, getAssets, type Goal, type Asset } from '../api'

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
  const [linkedId, setLinkedId] = useState<number | null>(existing?.linkedAssetId ?? null)
  const [pots, setPots] = useState<Asset[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Linkable savings pots: cash accounts and deposits.
  useEffect(() => {
    void getAssets().then((all) => setPots(all.filter((a) => a.isAccount || a.kind === 'deposit')))
  }, [])

  function pickPot(id: number | null) {
    setLinkedId(id)
    const p = pots.find((a) => a.id === id)
    if (p) setCurrency(p.currency) // measure progress in the pot's own currency
  }

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
      linkedAssetId: linkedId,
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

  const linked = pots.find((a) => a.id === linkedId)

  return (
    <Sheet title={existing ? 'Изменить цель' : 'Новая цель'} subtitle={linked ? `копим на счёте «${linked.name}»` : 'по капиталу или на отдельный счёт'} onClose={onCancel}>
      <div className="fld">
        <label>Название</label>
        <div className="inp-wrap">
          <input className="inp" type="text" placeholder="Напр. на машину" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="fld">
        <label>Копить на счёте/депозите <span className="hint">· прогресс по его балансу</span></label>
        <div className="inp-wrap">
          <select className="inp" value={linkedId ?? ''} onChange={(e) => pickPot(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— считать от всего капитала —</option>
            {pots.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}
          </select>
        </div>
        {linked && <p className="note">Накоплено = баланс «{linked.name}». Кидай туда деньги (доход на счёт), прогресс подтянется сам.</p>}
      </div>

      <div className="fld">
        <label>Валюта</label>
        <div className="seg">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" className={`${c === currency ? 'on' : ''}`} disabled={!!linked} onClick={() => setCurrency(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="fld">
        <label>Сумма цели</label>
        <div className="inp-wrap">
          <span className="inp-pre">{symbol(currency)}</span>
          <MoneyInput className="inp big" placeholder="0" value={target} onChange={setTarget} />
        </div>
      </div>

      <div className="fld">
        <label>Откладываю в месяц <span className="hint">· для прогноза срока</span></label>
        <div className="inp-wrap">
          <span className="inp-pre">{symbol(currency)}</span>
          <MoneyInput className="inp big" placeholder="0" value={monthly} onChange={setMonthly} />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : existing ? 'Сохранить' : 'Добавить'}</button>
      {existing && <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить цель</button>}
    </Sheet>
  )
}
