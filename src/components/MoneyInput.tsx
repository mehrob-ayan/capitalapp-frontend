import { cleanAmountInput, formatAmountInput } from '../format'

// MoneyInput is a drop-in for a money <input>. It shows the value with
// thousands separators (so an extra zero is obvious) but reports back a plain,
// parseFloat-friendly string — parents keep storing the raw value as before.
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder,
  autoFocus,
}: {
  value: string
  onChange: (raw: string) => void
  className?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={formatAmountInput(value)}
      onChange={(e) => onChange(cleanAmountInput(e.target.value))}
      autoFocus={autoFocus}
    />
  )
}
