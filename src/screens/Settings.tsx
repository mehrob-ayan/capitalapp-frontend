import { useEffect, useRef, useState } from 'react'
import { CURRENCIES } from '../kinds'
import { getRates, setRates, exportData, importData, getMe, setAutoRates } from '../api'
import { symbol } from '../format'
import { notifySupported, notifyEnabled, enableNotify, disableNotify } from '../notify'

const EDITABLE = ['TJS', 'UZS'] as const

export function Settings({
  baseCurrency,
  onChangeCurrency,
  onRatesSaved,
  onOpenGoals,
  onOpenOptions,
  onOpenActivity,
  onOpenEfficiency,
  onOpenAccounts,
}: {
  baseCurrency: string
  onChangeCurrency: (c: string) => void
  onRatesSaved: () => void
  onOpenGoals: () => void
  onOpenOptions: () => void
  onOpenActivity: () => void
  onOpenEfficiency: () => void
  onOpenAccounts: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [autoOn, setAutoOn] = useState<boolean | null>(null)
  const [notifyOn, setNotifyOn] = useState(notifyEnabled())
  const fileRef = useRef<HTMLInputElement>(null)

  async function toggleNotify() {
    if (notifyOn) {
      disableNotify()
      setNotifyOn(false)
      return
    }
    const ok = await enableNotify()
    setNotifyOn(ok)
    if (!ok) alert('Разреши уведомления для этого сайта в настройках браузера.')
  }

  // Stored rate is "value of 1 unit in USD"; we show/enter the friendlier
  // "how many <currency> for $1" (= 1 / stored).
  function loadRatesDraft() {
    void getRates().then((r) => {
      const d: Record<string, string> = {}
      for (const c of EDITABLE) {
        const perUSD = r[c] ?? 0
        const perDollar = perUSD > 0 ? 1 / perUSD : 0
        // UZS whole numbers; TJS to 4 decimals so the shown rate matches what's
        // stored (2 decimals lost precision and nudged the rate on re-save).
        d[c] = perDollar ? String(c === 'UZS' ? Math.round(perDollar) : Math.round(perDollar * 10000) / 10000) : ''
      }
      setDraft(d)
    })
  }

  useEffect(() => {
    loadRatesDraft()
    void getMe().then((u) => setAutoOn(u.autoRates ?? false))
  }, [])

  async function toggleAuto() {
    if (autoOn === null) return
    setBusy(true)
    try {
      const u = await setAutoRates(!autoOn)
      setAutoOn(u.autoRates ?? false)
      loadRatesDraft() // reflect freshly fetched rates
      onRatesSaved()
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setSaved(false)
    const map: Record<string, number> = {}
    for (const c of EDITABLE) {
      const perDollar = parseFloat(draft[c]) // how many <currency> for $1
      if (Number.isFinite(perDollar) && perDollar > 0) map[c] = 1 / perDollar
    }
    try {
      await setRates(map)
      setSaved(true)
      onRatesSaved()
    } finally {
      setSaving(false)
    }
  }

  async function doExport() {
    setBusy(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `capital-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    let payload: unknown
    try {
      payload = JSON.parse(await file.text())
    } catch {
      alert('Не удалось прочитать файл — это не похоже на резервную копию.')
      return
    }
    if (!window.confirm('Импорт ЗАМЕНИТ все текущие данные этой копией. Продолжить?')) return
    setBusy(true)
    try {
      await importData(payload)
      alert('Данные импортированы.')
      onRatesSaved()
    } catch {
      alert('Импорт не удался.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pad-screen">
      <div className="topbar">Ещё</div>

      <label className="section-lbl">Капитал</label>
      <button className="nav-row" onClick={onOpenAccounts}>
        <span>💳 Счета</span><span className="chev">›</span>
      </button>
      <button className="nav-row" onClick={onOpenGoals}>
        <span>🎯 Цели по капиталу</span><span className="chev">›</span>
      </button>
      <button className="nav-row" onClick={onOpenOptions}>
        <span>📈 Опционы</span><span className="chev">›</span>
      </button>
      <button className="nav-row" onClick={onOpenEfficiency}>
        <span>📊 Доход и эффективность</span><span className="chev">›</span>
      </button>

      <label className="section-lbl">Действия</label>
      <button className="nav-row" onClick={onOpenActivity}>
        <span>🕘 Действия</span><span className="chev">›</span>
      </button>

      <label className="section-lbl">Настройки</label>
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

      <label className="section-lbl">Курс: сколько за 1 доллар</label>
      {!draft && <p className="muted">Загрузка…</p>}
      {draft &&
        EDITABLE.map((c) => (
          <div className="rate-row" key={c}>
            <div className="rate-l">
              1 доллар в {c === 'TJS' ? 'сомони' : 'сумах'}
              <small>сколько {symbol(c)} за $1</small>
            </div>
            <input
              className="rate-v"
              type="number"
              step={c === 'UZS' ? '1' : '0.0001'}
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
          <small>курс с биржи раз в день</small>
        </div>
        <button
          className={`switch ${autoOn ? 'on' : ''}`}
          onClick={toggleAuto}
          disabled={busy || autoOn === null}
          aria-pressed={!!autoOn}
          aria-label="Автообновление курсов"
        />
      </div>
      <p className="note">
        {autoOn
          ? 'Курс обновляется раз в день с биржи. Можно поправить вручную в любой момент.'
          : 'Включи, чтобы курс подтягивался автоматически. Выключено — курс задаёшь сам.'}
      </p>

      {notifySupported() && (
        <>
          <div className="soon-row">
            <div className="rate-l">
              Уведомления в браузере
              <small>об изменениях и утреннем пересчёте</small>
            </div>
            <button
              className={`switch ${notifyOn ? 'on' : ''}`}
              onClick={toggleNotify}
              aria-pressed={notifyOn}
              aria-label="Уведомления в браузере"
            />
          </div>
          <p className="note">
            {notifyOn
              ? 'Уведомления включены. Приходят, пока приложение открыто (вкладка или установленное PWA).'
              : 'Включи, чтобы получать уведомление на каждое изменение капитала и утренний пересчёт курса.'}
          </p>
        </>
      )}

      <label className="section-lbl">Данные</label>
      <div className="data-actions">
        <button className="cbtn-sec" disabled={busy} onClick={doExport}>Экспорт в файл</button>
        <button className="cbtn-sec" disabled={busy} onClick={() => fileRef.current?.click()}>Импорт из файла</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
      </div>
      <p className="note">Экспорт — резервная копия всех активов, долгов, курсов и целей в один файл. Импорт заменит текущие данные содержимым файла.</p>
    </div>
  )
}
