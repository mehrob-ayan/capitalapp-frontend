import { useEffect, useState } from 'react'
import { getOptions, type OptionGrant, type OptionsList } from '../api'
import { money, monthYear } from '../format'
import { TopBar } from '../components/TopBar'
import { OptionForm } from './OptionForm'

function statusLine(g: OptionGrant): string {
  switch (g.status) {
    case 'vested':
      return `✅ Кристаллизовано · ${monthYear(g.vestDate)}`
    case 'vesting':
      return `⏳ Зреет до ${monthYear(g.vestDate)}`
    default:
      return `🔜 Получишь ${monthYear(g.grantDate)}`
  }
}

export function OptionsScreen({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<OptionsList | null>(null)
  const [form, setForm] = useState<{ existing?: OptionGrant } | null>(null)

  const load = () => { void getOptions().then(setData) }
  useEffect(load, [])

  const cur = data?.baseCurrency ?? 'USD'

  return (
    <div className="pad-screen with-back">
      {onBack ? <TopBar title="Опционы" onBack={onBack} /> : <div className="topbar">Опционы</div>}

      {!data && <p className="muted">Загрузка…</p>}

      {data && data.grants.length === 0 && (
        <p className="muted empty">Опционов пока нет. Добавь грант — покажу, что уже кристаллизовалось (в капитале) и что ещё зреет.</p>
      )}

      {data && data.grants.length > 0 && (
        <>
          <div className="eyebrow">Всего опционов</div>
          <div className="hero small">{money(data.totalBase, cur)}</div>

          <div className="exp-totals">
            <div><span className="k">В капитале</span><span className="v pos">{money(data.vestedBase, cur)}</span></div>
            <div><span className="k">Зреет</span><span className="v">{money(data.vestingBase, cur)}</span></div>
            <div><span className="k">Будущие</span><span className="v">{money(data.pendingBase, cur)}</span></div>
          </div>

          <label className="section-lbl">Гранты</label>
          <div className="list">
            {data.grants.map((g) => (
              <button key={g.id} className={`li opt-${g.status}`} onClick={() => setForm({ existing: g })}>
                <span className="li-main">
                  <span className="li-name">{g.name}</span>
                  <span className="li-sub">{statusLine(g)}</span>
                </span>
                <span className="li-amt">
                  <span className="li-a">{money(g.valueBase, cur)}</span>
                  <span className="li-sub">{new Intl.NumberFormat('ru-RU').format(g.quantity)} шт</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {data && (
        <button className="tile add-goal" onClick={() => setForm({})}>
          <b>＋ Добавить грант</b>
        </button>
      )}

      <p className="note">Кристаллизованные опционы стали акциями и уже входят в чистый капитал. «Зреет» и «Будущие» показаны отдельно — попадут в капитал в дату кристаллизации.</p>

      {form && <OptionForm existing={form.existing} onCancel={() => setForm(null)} onSaved={() => { setForm(null); load() }} />}
    </div>
  )
}
