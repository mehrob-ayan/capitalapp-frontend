import { TopBar } from '../components/TopBar'
import { HelperCard } from '../components/HelperCard'

export function Advisor({ onBack }: { onBack?: () => void }) {
  return (
    <div className="pad-screen with-back">
      {onBack ? <TopBar title="Помощник" onBack={onBack} /> : <div className="topbar">Помощник</div>}
      <HelperCard />
    </div>
  )
}
