const SYMBOLS: Record<string, string> = { USD: '$', TJS: 'смн', UZS: 'сўм' }
const PREFIXED = new Set(['USD']) // $ goes before the number; сомони/сум go after
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function symbol(currency: string): string {
  return SYMBOLS[currency] ?? currency
}

/** "$90 000" or "846 000 смн" — rounded, grouped, minus for negatives. */
export function money(value: number, currency: string): string {
  const rounded = Math.round(value)
  const grouped = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.abs(rounded))
  const sign = rounded < 0 ? '−' : ''
  const sym = symbol(currency)
  return PREFIXED.has(currency) ? `${sign}${sym}${grouped}` : `${sign}${grouped} ${sym}`
}

/** Signed variant for cash-flow figures. */
export function signedMoney(value: number, currency: string): string {
  const s = money(value, currency)
  return value > 0 ? `+${s}` : s
}

/** "+18%" / "−4%" rounded to one decimal, trailing .0 trimmed. */
export function percent(value: number, signed = true): string {
  const r = Math.round(value * 10) / 10
  const body = Number.isInteger(r) ? `${r}` : `${r}`
  const sign = signed && r > 0 ? '+' : ''
  return `${sign}${body}%`
}

/** "сен 2021" from an ISO date; "—" when absent/invalid. */
export function monthYear(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "18 июл 2026" from an ISO date string. */
export function dateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "15 лет 2 мес" from a month count. */
export function duration(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y > 0) parts.push(`${y} ${plural(y, 'год', 'года', 'лет')}`)
  if (m > 0) parts.push(`${m} мес`)
  return parts.join(' ') || '0 мес'
}

/**
 * cleanAmountInput normalizes a typed money string into a parseFloat-friendly
 * raw value: digits with at most one dot as the decimal separator. Accepts a
 * comma or a dot for decimals; strips spaces and any other characters.
 */
export function cleanAmountInput(display: string): string {
  let s = display.replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const dot = s.indexOf('.')
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')
  return s
}

/**
 * formatAmountInput renders a raw money string (from cleanAmountInput) with
 * thousands separators so a stray extra zero is easy to catch. Preserves a
 * trailing decimal separator and decimals while the user is still typing.
 */
export function formatAmountInput(raw: string): string {
  if (!raw) return ''
  const [int, ...rest] = raw.split('.')
  const grouped = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return raw.includes('.') ? `${grouped},${rest.join('')}` : grouped
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
