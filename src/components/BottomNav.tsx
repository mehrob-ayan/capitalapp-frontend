export type Tab = 'home' | 'history' | 'goals' | 'more'

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5v14h16" /><path d="M7 14l4-5 3 3 5-7" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 8h14M5 12h14M5 16h9" />
    </svg>
  ),
} satisfies Record<Tab, unknown>

const LABELS: Record<Tab, string> = { home: 'Обзор', history: 'История', goals: 'Цели', more: 'Ещё' }
const ORDER: Tab[] = ['home', 'history', 'goals', 'more']

export function BottomNav({ active, onTab, onAdd }: { active: Tab; onTab: (t: Tab) => void; onAdd: () => void }) {
  return (
    <nav className="tabbar">
      <button className={`tab ${active === 'home' ? 'on' : ''}`} onClick={() => onTab('home')}>
        {ICONS.home}<span>{LABELS.home}</span>
      </button>
      <button className={`tab ${active === 'history' ? 'on' : ''}`} onClick={() => onTab('history')}>
        {ICONS.history}<span>{LABELS.history}</span>
      </button>
      <button className="tab-add" onClick={onAdd} aria-label="Добавить">
        <span className="tab-add-b">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      {ORDER.slice(2).map((t) => (
        <button key={t} className={`tab ${active === t ? 'on' : ''}`} onClick={() => onTab(t)}>
          {ICONS[t]}<span>{LABELS[t]}</span>
        </button>
      ))}
    </nav>
  )
}
