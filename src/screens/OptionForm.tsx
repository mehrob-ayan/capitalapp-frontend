import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'
import { CURRENCIES } from '../kinds'
import { symbol } from '../format'
import { createOption, updateOption, deleteOption, type OptionGrant } from '../api'

// grantDate from the API is RFC3339; the <input type="month"> wants "YYYY-MM".
function toMonthInput(iso?: string): string {
  if (!iso) return ''
  return iso.slice(0, 7)
}

export function OptionForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing?: OptionGrant
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD')
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '')
  const [unitPrice, setUnitPrice] = useState(existing ? String(existing.unitPrice) : '')
  const [grantDate, setGrantDate] = useState(toMonthInput(existing?.grantDate))
  const [vestYears, setVestYears] = useState(existing ? String(existing.vestMonths / 12) : '2')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qty = parseFloat(quantity) || 0
  const price = parseFloat(unitPrice) || 0
  const preview = qty * price

  async function save() {
    if (qty <= 0) return setError('Укажите количество опционов')
    if (price < 0) return setError('Цена не может быть отрицательной')
    if (!grantDate) return setError('Укажите дату получения')
    setBusy(true)
    setError(null)
    const input = {
      name: name.trim() || 'Опционы',
      quantity: qty,
      unitPrice: price,
      currency,
      grantDate,
      vestMonths: Math.round((parseFloat(vestYears) || 0) * 12),
    }
    try {
      if (existing) await updateOption(existing.id, input)
      else await createOption(input)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing || !window.confirm('Удалить этот грант?')) return
    setBusy(true)
    try {
      await deleteOption(existing.id)
      onSaved()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Sheet title={existing ? 'Изменить грант' : 'Новый грант опционов'} subtitle="Кристаллизуется — попадёт в капитал" onClose={onCancel}>
      <div className="fld">
        <label>Название</label>
        <div className="inp-wrap">
          <input className="inp" type="text" placeholder="Напр. опционы компании" value={name} onChange={(e) => setName(e.target.value)} />
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
        <label>Количество опционов</label>
        <div className="inp-wrap">
          <MoneyInput className="inp big" placeholder="0" value={quantity} onChange={setQuantity} />
        </div>
      </div>

      <div className="fld">
        <label>Цена за штуку</label>
        <div className="inp-wrap">
          <span className="inp-pre">{symbol(currency)}</span>
          <MoneyInput className="inp big" placeholder="0" value={unitPrice} onChange={setUnitPrice} />
        </div>
      </div>

      {preview > 0 && (
        <p className="note">Стоимость гранта: <b>{symbol(currency)}{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(preview)}</b></p>
      )}

      <div className="fld">
        <label>Дата получения</label>
        <div className="inp-wrap">
          <input className="inp" type="month" value={grantDate} onChange={(e) => setGrantDate(e.target.value)} />
        </div>
      </div>

      <div className="fld">
        <label>Срок кристаллизации <span className="hint">· через сколько лет станут акциями</span></label>
        <div className="inp-wrap">
          <input className="inp big" type="number" inputMode="decimal" step="0.5" placeholder="2" value={vestYears} onChange={(e) => setVestYears(e.target.value)} />
          <span className="inp-suf">лет</span>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : existing ? 'Сохранить' : 'Добавить'}</button>
      {existing && <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить грант</button>}
    </Sheet>
  )
}
