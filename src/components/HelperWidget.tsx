import { useEffect, useState } from 'react'
import { getBrief } from '../api'
import { Markdownish } from './Markdownish'

// Floating "Капиталик" helper — a Jivo-style bubble in the corner instead of a
// card on the page. Fetches the daily brief in the background (cached per day),
// shows an unread dot when ready, and opens a small panel on click.
export function HelperWidget() {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [md, setMd] = useState('')
  const [err, setErr] = useState('')

  const load = (refresh = false) => {
    setState('loading')
    getBrief(refresh)
      .then((a) => { setMd(a.markdown); setState('done') })
      .catch((e) => { setErr(e instanceof Error ? e.message : 'Ошибка'); setState('error') })
  }
  useEffect(() => { load() }, [])

  const unread = state === 'done' && !seen && !open

  return (
    <>
      {open && (
        <div className="jivo-panel" role="dialog" aria-label="Помощник Капиталик">
          <div className="jivo-head">
            <span className="jivo-av" aria-hidden>🤖</span>
            <span className="jivo-name">Капиталик</span>
            {state !== 'loading' && <button className="jivo-act" onClick={() => load(true)}>обновить</button>}
            <button className="jivo-act" onClick={() => setOpen(false)} aria-label="Закрыть">✕</button>
          </div>
          <div className="jivo-body">
            {state === 'loading' && <p className="muted">Смотрю, что нового у тебя за день…</p>}
            {state === 'error' && <p className="helper-err">{err} <button className="helper-refresh" onClick={() => load()}>ещё раз</button></p>}
            {state === 'done' && <Markdownish text={md} />}
          </div>
        </div>
      )}
      <button className="jivo-fab" onClick={() => { setOpen((o) => !o); setSeen(true) }} aria-label="Помощник Капиталик">
        <span className="jivo-fab-ic" aria-hidden>🤖</span>
        {unread && <span className="jivo-dot" />}
      </button>
    </>
  )
}
