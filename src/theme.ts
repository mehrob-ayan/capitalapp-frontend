// Hybrid theming: brand + semantic colours are constant (our identity), while
// neutral surfaces follow the Telegram theme (or the OS scheme outside Telegram).
import { tg, type ThemeParams } from './telegram'

const LIGHT = { page: '#EEF0F3', card: '#FFFFFF', card2: '#F3F5F8', text: '#14181B', muted: '#76828C', line: '#E6EAEE' }
const DARK = { page: '#0F1720', card: '#18232F', card2: '#212E3B', text: '#EAF1F7', muted: '#8A99A8', line: '#26323F' }

const BRAND = {
  light: { brand: '#0E4A40', brandInk: '#FFFFFF', gold: '#9A7317', pos: '#2C875A', neg: '#BF5030' },
  dark: { brand: '#37A78E', brandInk: '#04231C', gold: '#D7B15D', pos: '#50BE87', neg: '#E0805F' },
}

export type ThemePref = 'light' | 'dark' | 'system'
const THEME_KEY = 'capital_theme'

/** The user's manual theme choice; 'system' follows Telegram/OS. */
export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return 'system'
}

export function setThemePref(pref: ThemePref): void {
  try { localStorage.setItem(THEME_KEY, pref) } catch { /* ignore */ }
  applyTheme()
}

function resolveScheme(): 'light' | 'dark' {
  const pref = getThemePref()
  if (pref !== 'system') return pref
  return tg?.colorScheme ?? preferredScheme()
}

export function applyTheme(): void {
  const pref = getThemePref()
  const scheme: 'light' | 'dark' = resolveScheme()
  // Only borrow Telegram's neutral colours when following the system; a manual
  // override uses our own palette so it wins over the host theme.
  const p: ThemeParams = pref === 'system' ? (tg?.themeParams ?? {}) : {}
  const neutrals = scheme === 'dark' ? DARK : LIGHT
  const brand = scheme === 'dark' ? BRAND.dark : BRAND.light

  const root = document.documentElement
  root.dataset.theme = scheme
  const set = (k: string, v: string | undefined) => v && root.style.setProperty(k, v)

  // Neutrals: prefer Telegram-provided values, fall back to ours.
  set('--page', p.secondary_bg_color ?? neutrals.page)
  set('--card', p.bg_color ?? neutrals.card)
  set('--card-2', p.section_bg_color ?? neutrals.card2)
  set('--text', p.text_color ?? neutrals.text)
  set('--muted', p.hint_color ?? neutrals.muted)
  set('--line', neutrals.line)

  // Brand + semantic: always ours, regardless of Telegram theme.
  set('--brand', brand.brand)
  set('--brand-ink', brand.brandInk)
  set('--gold', brand.gold)
  set('--pos', brand.pos)
  set('--neg', brand.neg)
}

/** Re-apply when the user switches Telegram theme while the app is open. */
export function watchTheme(): void {
  tg?.onEvent('themeChanged', applyTheme)
  // Follow OS scheme changes while on 'system'.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getThemePref() === 'system') applyTheme()
  })
}

function preferredScheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
