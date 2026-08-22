import { useEffect, useRef, useState } from 'react'
import { CURRENCIES } from '../../kinds'
import { getRates, setRates, refreshRates, exportData, importData, getMe, setAutoRates } from '../../api'
import { symbol } from '../../format'
import { MoneyInput } from '../../components/MoneyInput'
import { notifySupported, notifyEnabled, enableNotify, disableNotify } from '../../notify'

const EDITABLE = ['TJS', 'UZS'] as const

export function DesktopSettings({ baseCurrency, onChangeCurrency, onRatesSaved }: {
  baseCurrency: string
  onChangeCurrency: (c: string) => void
  onRatesSaved: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [autoOn, setAutoOn] = useState<boolean | null>(null)
  const [notifyOn, setNotifyOn] = useState(notifyEnabled())
  const fileRef = useRef<HTMLInputElement>(null)

  function loadRatesDraft() {
    void getRates().then((r) => {
      const d: Record<string, string> = {}
      for (const c of EDITABLE) {
        const perUSD = r[c] ?? 0
        const perDollar = perUSD > 0 ? 1 / perUSD : 0
        d[c] = perDollar ? String(c === 'UZS' ? Math.round(perDollar) : Math.round(perDollar * 10000) / 10000) : ''
      }
      setDraft(d)
    })
  }
  useEffect(() => { loadRatesDraft(); void getMe().then((u) => setAutoOn(u.autoRates ?? false)) }, [])

  async function toggleAuto() {
    if (autoOn === null) return
    setBusy(true)
    try { const u = await setAutoRates(!autoOn); setAutoOn(u.autoRates ?? false); loadRatesDraft(); onRatesSaved() } finally { setBusy(false) }
  }
  async function toggleNotify() {
    if (notifyOn) { disableNotify(); setNotifyOn(false); return }
    const ok = await enableNotify(); setNotifyOn(ok)
    if (!ok) alert('Разреши уведомления для этого сайта в настройках браузера.')
  }
  async function save() {
    if (!draft) return
    setSaving(true); setSaved(false)
    const map: Record<string, number> = {}
    for (const c of EDITABLE) { const p = parseFloat(draft[c]); if (Number.isFinite(p) && p > 0) map[c] = 1 / p }
    try { await setRates(map); setSaved(true); onRatesSaved() } finally { setSaving(false) }
  }
  async function refreshFromExchange() {
    setBusy(true)
    try { await refreshRates(); loadRatesDraft(); onRatesSaved(); setSaved(true) }
    catch { alert('Не удалось получить курс с биржи. Проверь интернет и попробуй ещё раз.') }
    finally { setBusy(false) }
  }
  async function doExport() {
    setBusy(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `capital-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
      URL.revokeObjectURL(url)
    } finally { setBusy(false) }
  }
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    let payload: unknown
    try { payload = JSON.parse(await file.text()) } catch { alert('Не удалось прочитать файл.'); return }
    if (!window.confirm('Импорт ЗАМЕНИТ все текущие данные этой копией. Продолжить?')) return
    setBusy(true)
    try { await importData(payload); alert('Данные импортированы.'); onRatesSaved() } catch { alert('Импорт не удался.') } finally { setBusy(false) }
  }

  return (
    <div className="dt-grid c-2 dt-start">
      <section className="dt-card dt-pad">
        <div className="dt-card-head"><span className="dt-card-ttl">Валюта и курсы</span></div>
        <div className="fld"><label>Итог показывать в</label><div className="seg">
          {CURRENCIES.map((c) => <button key={c} type="button" className={c === baseCurrency ? 'on' : ''} onClick={() => onChangeCurrency(c)}>{c}</button>)}
        </div></div>
        {!draft && <p className="muted">Загрузка…</p>}
        {draft && EDITABLE.map((c) => (
          <div className="rate-row" key={c}>
            <div className="rate-l">1 доллар в {c === 'TJS' ? 'сомони' : 'сумах'}<small>сколько {symbol(c)} за $1</small></div>
            <MoneyInput className="rate-v" value={draft[c]} onChange={(v) => setDraft({ ...draft, [c]: v })} />
          </div>
        ))}
        {draft && <button className="dt-btn-ghost" style={{ width: '100%', marginTop: 8 }} disabled={busy} onClick={refreshFromExchange}>{busy ? 'Получаю курс…' : '↻ Обновить курс из ЦБ'}</button>}
        {draft && <button className="mainbtn" disabled={saving} onClick={save}>{saving ? 'Сохранение…' : 'Сохранить курсы'}</button>}
        {saved && <p className="saved-msg">Курсы обновлены</p>}
      </section>

      <div className="dt-col-cards">
        <section className="dt-card dt-pad">
          <div className="dt-card-head"><span className="dt-card-ttl">Автоматизация</span></div>
          <div className="soon-row" style={{ marginTop: 0 }}>
            <div className="rate-l">Обновлять курс автоматически<small>с биржи раз в день</small></div>
            <button className={`switch ${autoOn ? 'on' : ''}`} onClick={toggleAuto} disabled={busy || autoOn === null} aria-pressed={!!autoOn} />
          </div>
          {notifySupported() && (
            <div className="soon-row">
              <div className="rate-l">Уведомления в браузере<small>об изменениях и утреннем пересчёте</small></div>
              <button className={`switch ${notifyOn ? 'on' : ''}`} onClick={toggleNotify} aria-pressed={notifyOn} />
            </div>
          )}
        </section>

        <section className="dt-card dt-pad">
          <div className="dt-card-head"><span className="dt-card-ttl">Данные</span></div>
          <div className="data-actions">
            <button className="cbtn-sec" disabled={busy} onClick={doExport}>Экспорт в файл</button>
            <button className="cbtn-sec" disabled={busy} onClick={() => fileRef.current?.click()}>Импорт из файла</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
          </div>
          <p className="note">Экспорт — резервная копия всех активов, долгов, курсов и целей в один файл. Импорт заменит текущие данные содержимым файла.</p>
        </section>
      </div>
    </div>
  )
}
