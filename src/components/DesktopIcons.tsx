// Line icons for the desktop sidebar and header, in the same style as
// components/BottomNav.tsx (24×24, stroke-width 1.8, round caps/joins). The
// Обзор / Динамика / Расходы paths are the same as the tab-bar icons.
import type { ReactNode } from 'react'

const svg = (children: ReactNode, strokeWidth = 1.8) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export type NavIconKey = 'home' | 'history' | 'expenses' | 'accounts' | 'goals' | 'options' | 'efficiency' | 'activity' | 'settings'

export const NAV_ICONS: Record<NavIconKey, ReactNode> = {
  home: svg(<><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /></>),
  history: svg(<><path d="M4 5v14h16" /><path d="M7 14l4-5 3 3 5-7" /></>),
  expenses: svg(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" /></>),
  accounts: svg(<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M16 11.5h4v3.5h-4a1.75 1.75 0 0 1 0-3.5z" /></>),
  goals: svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /></>),
  options: svg(<><path d="M4 16l5-5 3 3 7-8" /><path d="M17 6h4v4" /></>),
  efficiency: svg(<><path d="M5 19a8 8 0 1 1 14 0" /><path d="M12 19l4-6" /></>),
  activity: svg(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>),
  settings: svg(<><path d="M4 7h9M17 7h3" /><circle cx="15" cy="7" r="2" /><path d="M4 17h3M11 17h9" /><circle cx="9" cy="17" r="2" /></>),
}

export const SearchIcon = () => svg(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>)
export const BellIcon = () => svg(<><path d="M6 15V11a6 6 0 1 1 12 0v4l1.6 2H4.4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>)
export const PlusIcon = () => svg(<path d="M12 5v14M5 12h14" />, 2.2)
