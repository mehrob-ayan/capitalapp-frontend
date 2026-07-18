import { useEffect, useState } from 'react'
import { CURRENCIES } from '../kinds'
import { getRates, setRates } from '../api'
import { symbol } from '../format'

const EDITABLE = ['TJS', 'UZS'] as const

export function Settings({
  baseCurrency,
  onChangeCurrency,
  onRatesSaved,
}: {
  baseCurrency: string
  onChangeCurrency: (c: string) => void
  onRatesSaved: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void getRates().then((r) => {
      const d: Record<string, string> = {}
      for (const c of EDITABLE) d[c] = String(r[c] ?? '')
      setDraft(d)
    })
  }, [])

  async function save() {
    if (!draft) return
    setSaving(true)
    setSaved(false)
    const map: Record<string, number> = {}
    for (const c of EDITABLE) {
      const n = parseFloat(draft[c])
      if (Number.isFinite(n) && n > 0) map[c] = n
    }
    try {
      await setRates(map)
      setSaved(true)
      onRatesSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pad-screen">
      <div className="topbar">Ещё</div>

      <div className="fld">
        <label>Итог показывать в</label>
        <div className="seg">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" className={c === baseCurrency ? 'on' : ''} onClick={() => onChangeCurrency(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="section-lbl">Курсы к доллару</label>
      {!draft && <p className="muted">Загрузка…</p>}
      {draft &&
        EDITABLE.map((c) => (
          <div className="rate-row" key={c}>
            <div className="rate-l">
              1 {c}
              <small>{symbol(c)} → доллар США</small>
            </div>
            <input
              className="rate-v"
              type="number"
              step="0.0001"
              inputMode="decimal"
              value={draft[c]}
              onChange={(e) => setDraft({ ...draft, [c]: e.target.value })}
            />
          </div>
        ))}

      {draft && (
        <button className="mainbtn" disabled={saving} onClick={save}>
          {saving ? 'Сохранение…' : 'Сохранить курсы'}
        </button>
      )}
      {saved && <p className="saved-msg">Курсы сохранены</p>}

      <div className="soon-row">
        <div className="rate-l">
          Обновлять автоматически
          <small>курсы с биржи</small>
        </div>
        <span className="soon">Скоро</span>
      </div>
      <p className="note">Пока курсы задаются вручную — приложение не зависит от внешних сервисов.</p>
    </div>
  )
}
