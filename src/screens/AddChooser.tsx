import { Sheet } from '../components/Sheet'
import { CHOOSER_ADVANCED, CHOOSER_PRIMARY, KIND_META, type Kind } from '../kinds'

export function AddChooser({ onPick, onClose }: { onPick: (kind: Kind) => void; onClose: () => void }) {
  return (
    <Sheet title="Что добавить?" subtitle="Выберите, что у вас есть — простыми словами" onClose={onClose}>
      <div className="chooser">
        {CHOOSER_PRIMARY.map((k) => (
          <Tile key={k} kind={k} onPick={onPick} />
        ))}
        <div className="grouplbl">Если инвестируете</div>
        {CHOOSER_ADVANCED.map((k) => (
          <Tile key={k} kind={k} onPick={onPick} />
        ))}
      </div>
    </Sheet>
  )
}

function Tile({ kind, onPick }: { kind: Kind; onPick: (kind: Kind) => void }) {
  const meta = KIND_META[kind]
  return (
    <button className="tile" onClick={() => onPick(kind)}>
      <span className="tile-ic" style={{ background: meta.color }}>{meta.letter}</span>
      <span className="tile-tx">
        <b>{meta.label}</b>
        <small>{meta.example}</small>
      </span>
      <span className="chev">›</span>
    </button>
  )
}
