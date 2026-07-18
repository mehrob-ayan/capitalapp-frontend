// Thin, typed wrapper around the Telegram WebApp bridge (window.Telegram.WebApp).
// Outside Telegram (plain browser / future website) window.Telegram is absent,
// so every helper degrades gracefully.

export interface ThemeParams {
  bg_color?: string
  secondary_bg_color?: string
  section_bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
}

interface BackButton {
  show: () => void
  hide: () => void
  onClick: (cb: () => void) => void
  offClick: (cb: () => void) => void
}

interface TelegramWebApp {
  initData: string
  colorScheme: 'light' | 'dark'
  themeParams: ThemeParams
  ready: () => void
  expand: () => void
  onEvent: (type: string, cb: () => void) => void
  BackButton: BackButton
  HapticFeedback?: { impactOccurred: (style: string) => void }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export const tg: TelegramWebApp | undefined = window.Telegram?.WebApp

export function initTelegram(): void {
  if (!tg) return
  tg.ready()
  tg.expand()
}

/** True when running inside Telegram with real signed initData. */
export function isInsideTelegram(): boolean {
  return Boolean(tg && tg.initData)
}

let backHandler: (() => void) | null = null

/** Show/hide Telegram's native back button and wire its handler. */
export function setBackButton(cb: (() => void) | null): void {
  if (!tg?.BackButton) return
  if (backHandler) tg.BackButton.offClick(backHandler)
  backHandler = cb
  if (cb) {
    tg.BackButton.onClick(cb)
    tg.BackButton.show()
  } else {
    tg.BackButton.hide()
  }
}

export function haptic(): void {
  tg?.HapticFeedback?.impactOccurred('light')
}
