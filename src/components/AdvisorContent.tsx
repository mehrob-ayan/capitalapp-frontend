import { useCallback, useEffect, useState } from 'react'
import type { Advice } from '../api'
import { Markdownish } from './Markdownish'

// Drives one advisor request: idle → loading → result/error, with re-run.
// `auto` starts immediately (used when the user explicitly opens a credit audit);
// otherwise it shows a start button (portfolio audit costs time, so opt-in).
export function AdvisorContent({ run, auto = false, intro }: { run: () => Promise<Advice>; auto?: boolean; intro?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(auto ? 'loading' : 'idle')
  const [md, setMd] = useState('')
  const [err, setErr] = useState('')

  const go = useCallback(() => {
    setState('loading')
    setErr('')
    run()
      .then((a) => { setMd(a.markdown); setState('done') })
      .catch((e) => { setErr(e instanceof Error ? e.message : 'Ошибка'); setState('error') })
  }, [run])

  useEffect(() => { if (auto) go() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'idle') {
    return (
      <div className="advisor-idle">
        {intro && <p className="muted">{intro}</p>}
        <button className="mainbtn" onClick={go}>Запустить аудит</button>
      </div>
    )
  }
  if (state === 'loading') {
    return <p className="muted advisor-loading">Аудитор изучает данные… это может занять до минуты.</p>
  }
  if (state === 'error') {
    return (
      <div>
        <p className="form-error">{err}</p>
        <button className="linkbtn" onClick={go}>Повторить</button>
      </div>
    )
  }
  return (
    <div>
      <Markdownish text={md} />
      <button className="linkbtn" onClick={go}>Обновить аудит</button>
    </div>
  )
}
