import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'
import { CURRENCIES } from '../kinds'
import { symbol, money } from '../format'
import { createOption, updateOption, deleteOption, type OptionGrant } from '../api'

const toMonthInput = (iso?: string) => (iso ? iso.slice(0, 7) : '')
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '')

export function OptionForm({ existing, onCancel, onSaved }: { existing?: OptionGrant; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name ?? '')
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD')
  const [mode, setMode] = useState<'rsu' | 'strike'>(existing && existing.marketPrice > 0 ? 'strike' : 'rsu')
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '')
  const [unitPrice, setUnitPrice] = useState(existing ? String(existing.unitPrice) : '')
  const [strike, setStrike] = useState(existing?.strike ? String(existing.strike) : '')
  const [market, setMarket] = useState(existing?.marketPrice ? String(existing.marketPrice) : '')
  const [grantDate, setGrantDate] = useState(toMonthInput(existing?.grantDate))
  const [vestYears, setVestYears] = useState(existing && !existing.fullVestDate ? String(existing.vestMonths / 12) : '2')
  const [fullVest, setFullVest] = useState(toDateInput(existing?.fullVestDate))
  const [exDeadline, setExDeadline] = useState(toDateInput(existing?.exerciseDeadline))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qty = parseFloat(quantity) || 0
  const price = parseFloat(unitPrice) || 0
  const strikeN = parseFloat(strike) || 0
  const marketN = parseFloat(market) || 0
  const net = Math.max(0, marketN - strikeN)
  const preview = mode === 'strike' ? qty * net : qty * price
  const underwater = mode === 'strike' && marketN > 0 && marketN <= strikeN

  async function save() {
    if (qty <= 0) return setError('Укажите количество опционов')
    if (!grantDate) return setError('Укажите дату получения')
    if (mode === 'strike' && marketN <= 0) return setError('Укажите текущую цену акции')
    setBusy(true)
    setError(null)
    const input = {
      name: name.trim() || 'Опционы',
      quantity: qty,
      currency,
      grantDate,
      vestMonths: Math.round((parseFloat(vestYears) || 0) * 12),
      unitPrice: mode === 'rsu' ? price : 0,
      strike: mode === 'strike' ? strikeN : 0,
      marketPrice: mode === 'strike' ? marketN : 0,
      fullVestDate: fullVest || null,
      exerciseDeadline: mode === 'strike' ? (exDeadline || null) : null,
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
    try { await deleteOption(existing.id); onSaved() } catch { setBusy(false) }
  }

  return (
    <Sheet title={existing ? 'Изменить грант' : 'Новый грант опционов'} subtitle="Кристаллизуется — попадёт в капитал" onClose={onCancel}>
      <div className="fld">
        <label>Название</label>
        <div className="inp-wrap"><input className="inp" type="text" placeholder="Напр. опционы компании" value={name} onChange={(e) => setName(e.target.value)} /></div>
      </div>

      <div className="fld">
        <label>Вид</label>
        <div className="seg">
          <button type="button" className={mode === 'rsu' ? 'on' : ''} onClick={() => setMode('rsu')}>Бесплатные / RSU</button>
          <button type="button" className={mode === 'strike' ? 'on' : ''} onClick={() => setMode('strike')}>С ценой исполнения</button>
        </div>
      </div>

      <div className="fld">
        <label>Валюта</label>
        <div className="seg">
          {CURRENCIES.map((c) => <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>{c}</button>)}
        </div>
      </div>

      <div className="fld">
        <label>Количество опционов</label>
        <div className="inp-wrap"><MoneyInput className="inp big" placeholder="0" value={quantity} onChange={setQuantity} /></div>
      </div>

      {mode === 'rsu' ? (
        <div className="fld">
          <label>Стоимость за штуку</label>
          <div className="inp-wrap"><span className="inp-pre">{symbol(currency)}</span><MoneyInput className="inp big" placeholder="0" value={unitPrice} onChange={setUnitPrice} /></div>
        </div>
      ) : (
        <>
          <div className="fld">
            <label>Цена исполнения <span className="hint">· сколько платишь за акцию (strike)</span></label>
            <div className="inp-wrap"><span className="inp-pre">{symbol(currency)}</span><MoneyInput className="inp big" placeholder="0" value={strike} onChange={setStrike} /></div>
          </div>
          <div className="fld">
            <label>Текущая цена акции</label>
            <div className="inp-wrap"><span className="inp-pre">{symbol(currency)}</span><MoneyInput className="inp big" placeholder="0" value={market} onChange={setMarket} /></div>
          </div>
        </>
      )}

      {underwater ? (
        <p className="note">Сейчас «под водой»: цена акции ({symbol(currency)}{marketN}) ≤ цены исполнения ({symbol(currency)}{strikeN}) — ценность <b>0</b>, пока акция не вырастет.</p>
      ) : preview > 0 && (
        <p className="note">Ценность гранта: <b>{money(preview, currency)}</b>{mode === 'strike' && <> · {qty} × ({money(marketN, currency)} − {money(strikeN, currency)})</>}</p>
      )}

      <div className="fld">
        <label>Дата получения</label>
        <div className="inp-wrap"><input className="inp" type="month" value={grantDate} onChange={(e) => setGrantDate(e.target.value)} /></div>
      </div>

      <div className="fld">
        <label>Дата полного вестинга <span className="hint">· если известна точно — приоритетнее срока</span></label>
        <div className="inp-wrap"><input className="inp" type="date" value={fullVest} onChange={(e) => setFullVest(e.target.value)} /></div>
      </div>

      {!fullVest && (
        <div className="fld">
          <label>Срок кристаллизации <span className="hint">· через сколько лет</span></label>
          <div className="inp-wrap"><input className="inp big" type="number" inputMode="decimal" step="0.5" placeholder="2" value={vestYears} onChange={(e) => setVestYears(e.target.value)} /><span className="inp-suf">лет</span></div>
        </div>
      )}

      {mode === 'strike' && (
        <div className="fld">
          <label>Крайний срок исполнения <span className="hint">· после — сгорают</span></label>
          <div className="inp-wrap"><input className="inp" type="date" value={exDeadline} onChange={(e) => setExDeadline(e.target.value)} /></div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <button className="mainbtn" disabled={busy} onClick={save}>{busy ? 'Сохранение…' : existing ? 'Сохранить' : 'Добавить'}</button>
      {existing && <button className="linkbtn danger" disabled={busy} onClick={remove}>Удалить грант</button>}
    </Sheet>
  )
}
