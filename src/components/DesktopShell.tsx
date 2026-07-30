import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '../api'
import { CURRENCIES, kindColor, type Kind } from '../kinds'
import { NAV_ICONS, type NavIconKey, SearchIcon, BellIcon, PlusIcon } from './DesktopIcons'

export type NavKey = NavIconKey

const CAPITAL_NAV: [NavKey, string][] = [
  ['home', 'Обзор'], ['history', 'Динамика'], ['expenses', 'Расходы'],
  ['accounts', 'Счета'], ['goals', 'Цели'], ['options', 'Опционы'], ['efficiency', 'Эффективность'],
]
const JOURNAL_NAV: [NavKey, string][] = [['activity', 'Действия'], ['settings', 'Настройки']]

export interface DesktopShellProps {
  active: NavKey | null
  title: string
  subtitle?: string
  onBack?: () => void
  base: string
  onChangeCurrency: (c: string) => void
  user: User
  onNav: (key: NavKey) => void
  onAdd: (kind: Kind) => void
  onExpenseAdd: () => void
  onPayDebt: () => void
  onOpenChooser: () => void
  children: ReactNode
}

export function DesktopShell(props: DesktopShellProps) {
  const { active, title, subtitle, onBack, base, onChangeCurrency, user, onNav } = props
  const [addOpen, setAddOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (!typing && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        setAddOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setAddOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const initial = (user.firstName || user.username || 'Я').charAt(0).toUpperCase()

  const navItem = ([key, label]: [NavKey, string]) => (
    <button key={key} className={`dt-nav ${key === active ? 'on' : ''}`} onClick={() => onNav(key)}>
      <span className="dt-nav-ic">{NAV_ICONS[key]}</span>
      {label}
    </button>
  )

  return (
    <div className="dt-shell" data-dt>
      <aside className="dt-side">
        <div className="dt-logo">
          <span className="dt-logo-mk">К</span>
          <span className="dt-logo-tx">Мой капитал</span>
        </div>

        <button className="dt-add" onClick={() => setAddOpen((o) => !o)}>
          <span className="dt-add-ic"><PlusIcon /></span>
          Добавить
          <kbd className="dt-add-kbd">N</kbd>
        </button>

        {addOpen && (
          <div className="dt-addmenu" role="menu">
            <div className="dt-addgrp">Часто</div>
            <AddItem color="#BF5030" label="Расход или доход" onClick={() => { setAddOpen(false); props.onExpenseAdd() }} />
            <AddItem color="#C6A254" label="Платёж по кредиту" onClick={() => { setAddOpen(false); props.onPayDebt() }} />
            <div className="dt-addgrp">Позиция</div>
            <AddItem color={kindColor('realestate')} label="Недвижимость" onClick={() => { setAddOpen(false); props.onAdd('realestate') }} />
            <AddItem color={kindColor('deposit')} label="Вклад" onClick={() => { setAddOpen(false); props.onAdd('deposit') }} />
            <AddItem color={kindColor('debt')} label="Кредит или долг" onClick={() => { setAddOpen(false); props.onAdd('debt') }} />
            <AddItem label="Все типы…" onClick={() => { setAddOpen(false); props.onOpenChooser() }} />
          </div>
        )}

        <div className="dt-navgrp">Капитал</div>
        <nav className="dt-navlist">{CAPITAL_NAV.map(navItem)}</nav>
        <div className="dt-navgrp">Журнал</div>
        <nav className="dt-navlist">{JOURNAL_NAV.map(navItem)}</nav>

        <div className="dt-spacer" />

        <div className="dt-foot">
          <div className="dt-navgrp foot">Итог в валюте</div>
          <div className="dt-ccy" role="group" aria-label="Валюта итога">
            {CURRENCIES.map((c) => (
              <button key={c} className={c === base ? 'on' : ''} onClick={() => onChangeCurrency(c)}>{c}</button>
            ))}
          </div>
          <button className="dt-user" onClick={() => onNav('settings')}>
            <span className="dt-user-av">{initial}</span>
            <span className="dt-user-nm">{user.firstName || user.username || 'Профиль'}</span>
            <span className="dt-user-ch">›</span>
          </button>
        </div>
      </aside>

      <div className="dt-col">
        <header className="dt-head">
          {onBack && <button className="dt-back" onClick={onBack} aria-label="Назад">‹</button>}
          <div className="dt-head-ttl">{title}</div>
          {subtitle && <div className="dt-head-sub">{subtitle}</div>}
          <div className="dt-spacer" />
          <label className="dt-search">
            <span className="dt-search-ic"><SearchIcon /></span>
            <input ref={searchRef} placeholder="Поиск по капиталу" aria-label="Поиск" />
            <kbd className="dt-search-kbd">⌘K</kbd>
          </label>
          <button className="dt-bell" onClick={() => onNav('activity')} aria-label="Что изменилось"><BellIcon /></button>
        </header>

        <div className="dt-work">{props.children}</div>
      </div>
    </div>
  )
}

function AddItem({ color, label, onClick }: { color?: string; label: string; onClick: () => void }) {
  return (
    <button className={`dt-additem ${color ? '' : 'all'}`} role="menuitem" onClick={onClick}>
      {color && <i style={{ background: color }} />}
      {label}
    </button>
  )
}
