export type Tab = 'home' | 'expenses' | 'history' | 'more'

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" />
    </svg>
  ),
  expenses: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5v14h16" /><path d="M7 14l4-5 3 3 5-7" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 8h14M5 12h14M5 16h9" />
    </svg>
  ),
} satisfies Record<Tab, unknown>

const LABELS: Record<Tab, string> = { home: 'Обзор', expenses: 'Расходы', history: 'Динамика', more: 'Ещё' }

export function BottomNav({ active, onTab, onAdd }: { active: Tab; onTab: (t: Tab) => void; onAdd: () => void }) {
  const tab = (t: Tab) => (
    <button className={`tab ${active === t ? 'on' : ''}`} onClick={() => onTab(t)}>
      {ICONS[t]}<span>{LABELS[t]}</span>
    </button>
  )
  return (
    <nav className="tabbar">
      {tab('home')}
      {tab('expenses')}
      <button className="tab-add" onClick={onAdd} aria-label="Добавить">
        <span className="tab-add-b">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      {tab('history')}
      {tab('more')}
    </nav>
  )
}
