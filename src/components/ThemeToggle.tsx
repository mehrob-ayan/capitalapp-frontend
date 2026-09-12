import { useState } from 'react'
import { getThemePref, setThemePref, type ThemePref } from '../theme'

const OPTS: [ThemePref, string][] = [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']]

// Segmented light/dark/system theme switch. Persists via theme.ts.
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(getThemePref())
  const pick = (p: ThemePref) => { setPref(p); setThemePref(p) }
  return (
    <div className="seg">
      {OPTS.map(([v, l]) => (
        <button key={v} type="button" className={v === pref ? 'on' : ''} onClick={() => pick(v)}>{l}</button>
      ))}
    </div>
  )
}
