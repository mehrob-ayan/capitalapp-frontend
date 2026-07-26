// Browser notifications for capital changes. Works while the app (tab/PWA) is
// running — the app polls the activity log and raises a notification for each
// new entry (a change you made, or the morning auto rate-sync recalculation).
// Delivery while the browser is fully closed would need a push server; this
// covers the practical "keep it open" case.

const ENABLED_KEY = 'capital_notify'
const LASTSEEN_KEY = 'capital_notify_lastseen'

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notifyEnabled(): boolean {
  return notifySupported() && Notification.permission === 'granted' && localStorage.getItem(ENABLED_KEY) === '1'
}

// enableNotify asks for permission (if needed) and remembers the opt-in.
export async function enableNotify(): Promise<boolean> {
  if (!notifySupported()) return false
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm === 'granted') {
    localStorage.setItem(ENABLED_KEY, '1')
    return true
  }
  return false
}

export function disableNotify(): void {
  localStorage.removeItem(ENABLED_KEY)
}

export function showNotify(title: string, body: string): void {
  if (!notifyEnabled()) return
  try {
    new Notification(title, { body, icon: '/favicon.svg' })
  } catch {
    /* ignore — some browsers restrict construction */
  }
}

export function getLastSeen(): number {
  return Number(localStorage.getItem(LASTSEEN_KEY) || '0')
}

export function setLastSeen(id: number): void {
  localStorage.setItem(LASTSEEN_KEY, String(id))
}
