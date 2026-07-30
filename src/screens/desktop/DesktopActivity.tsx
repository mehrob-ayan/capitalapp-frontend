import { useEffect, useMemo, useState } from 'react'
import { getActivity, type ActivityList } from '../../api'
import { money, signedMoney, dateShort } from '../../format'
import { activityDot } from './shared'

const AUTO = new Set(['salary', 'rate_changed', 'debt_interest', 'interest'])

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${dateShort(iso).split(' ').slice(0, 2).join(' ')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function DesktopActivity() {
  const [data, setData] = useState<ActivityList | null>(null)
  const [filter, setFilter] = useState<'all' | 'auto' | 'mine'>('all')
  useEffect(() => { void getActivity().then(setData) }, [])
  const cur = data?.baseCurrency ?? 'USD'

  const items = useMemo(() => {
    if (!data) return []
    if (filter === 'auto') return data.items.filter((a) => AUTO.has(a.kind))
    if (filter === 'mine') return data.items.filter((a) => !AUTO.has(a.kind))
    return data.items
  }, [data, filter])

  return (
    <div className="dt-grid c-one-full">
      <section className="dt-card dt-pad dt-act">
        <div className="dt-comp-head">
          <div className="dt-comp-ttl">Действия</div>
          <div className="dt-comp-cnt">журнал изменений капитала</div>
          <div className="dt-spacer" />
          <div className="dt-chips sm">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Все</button>
            <button className={filter === 'auto' ? 'on' : ''} onClick={() => setFilter('auto')}>Автоматические</button>
            <button className={filter === 'mine' ? 'on' : ''} onClick={() => setFilter('mine')}>Мои</button>
          </div>
        </div>

        <div className="dt-thead dt-act-grid">
          <span>Событие</span><span>Детали</span><span>Когда</span><span className="r">Изменение</span><span className="r">Капитал</span>
        </div>
        <div className="dt-tbody">
          {items.map((a) => (
            <div key={a.id} className="dt-trow dt-act-grid static">
              <span className="dt-tc-name"><i style={{ background: activityDot(a.kind), borderRadius: '50%' }} />{a.title}</span>
              <span className="muted ell">{a.detail || '—'}</span>
              <span className="muted">{when(a.createdAt)}</span>
              <span className={`r num ${a.changeAbs > 0 ? 'pos' : a.changeAbs < 0 ? 'neg' : 'muted'}`}>{a.changeAbs !== 0 ? signedMoney(a.changeAbs, cur) : '—'}</span>
              <span className="r muted dt-act-net">{money(a.netBefore, cur)} → <b>{money(a.netAfter, cur)}</b></span>
            </div>
          ))}
          {data && items.length === 0 && <p className="muted" style={{ padding: '14px 0' }}>Пока пусто.</p>}
        </div>
      </section>
    </div>
  )
}
