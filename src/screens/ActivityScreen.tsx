import { useEffect, useState } from 'react'
import { getActivity, type Activity, type ActivityList } from '../api'
import { money, signedMoney, dateShort } from '../format'
import { TopBar } from '../components/TopBar'

const ICON: Record<string, string> = {
  asset_added: '➕',
  asset_edited: '✏️',
  asset_removed: '🗑️',
  option_added: '📈',
  option_edited: '✏️',
  option_removed: '🗑️',
  rate_changed: '💱',
}

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${dateShort(iso)}, ${hh}:${mm}`
}

function subLine(a: Activity): string {
  if (a.detail) return a.detail
  if (a.amount) return money(a.amount, a.currency)
  return ''
}

export function ActivityScreen({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<ActivityList | null>(null)

  useEffect(() => { void getActivity().then(setData) }, [])

  const cur = data?.baseCurrency ?? 'USD'

  return (
    <div className="pad-screen with-back">
      {onBack ? <TopBar title="Действия" onBack={onBack} /> : <div className="topbar">Действия</div>}

      {!data && <p className="muted">Загрузка…</p>}

      {data && data.items.length === 0 && (
        <p className="muted empty">Пока пусто. Здесь появится каждое действие — что добавил, что изменил, как двигался курс — и как от этого менялся капитал.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="list">
          {data.items.map((a) => (
            <div className="li static" key={a.id}>
              <span className="li-main">
                <span className="li-name">{ICON[a.kind] ?? '•'} {a.title}</span>
                <span className="li-chg">{subLine(a)}</span>
                <span className="li-sub">{when(a.createdAt)}</span>
              </span>
              <span className="li-amt">
                {a.changeAbs !== 0 ? (
                  <>
                    <span className={`li-a act-delta ${a.changeAbs > 0 ? 'pos' : 'neg'}`}>{signedMoney(a.changeAbs, cur)}</span>
                    <span className="li-sub">
                      {money(a.netBefore, cur)} → <b className={a.changeAbs > 0 ? 'pos' : 'neg'}>{money(a.netAfter, cur)}</b>
                    </span>
                  </>
                ) : (
                  <span className="li-sub">капитал не изменился</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="note">Изменение капитала показано в твоей базовой валюте. Курсовые движения записываются отдельной строкой — видно, когда капитал сдвинулся из-за курса, а не твоих действий.</p>
    </div>
  )
}
