import type { ReactNode } from 'react'

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        <h3 className="sheet-h">{title}</h3>
        {subtitle && <p className="sheet-cap">{subtitle}</p>}
        {children}
      </div>
    </>
  )
}
