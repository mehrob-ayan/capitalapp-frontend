export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="topbar-nav">
      {onBack && (
        <button className="topbar-back" onClick={onBack} aria-label="Назад">‹</button>
      )}
      <div className="topbar-title">{title}</div>
    </div>
  )
}
