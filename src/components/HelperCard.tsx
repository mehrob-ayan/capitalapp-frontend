import { useEffect, useState } from 'react'
import { getBrief } from '../api'
import { Markdownish } from './Markdownish'

// The in-app helper ("Капиталик") — a proactive chat bubble on the overview
// that greets the user, reports what changed today and flags inconsistencies.
// The brief is cached server-side per day, so repeat opens are instant.
export function HelperCard() {
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

  return (
    <div className="helper">
      <div className="helper-av" aria-hidden>🤖</div>
      <div className="helper-body">
        <div className="helper-top">
          <span className="helper-name">Капиталик</span>
          {state !== 'loading' && <button className="helper-refresh" onClick={() => load(true)}>обновить</button>}
        </div>
        {state === 'loading' && <p className="muted helper-loading">Смотрю, что нового у тебя за день…</p>}
        {state === 'error' && (
          <p className="helper-err">{err} <button className="helper-refresh" onClick={() => load()}>ещё раз</button></p>
        )}
        {state === 'done' && <Markdownish text={md} />}
      </div>
    </div>
  )
}
