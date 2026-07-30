import { useEffect, useState } from 'react'
import { getOptions, type OptionGrant, type OptionsList } from '../../api'
import { money, monthYear } from '../../format'
import { OptionForm } from '../OptionForm'

const STATUS: Record<string, { label: string; cls: string }> = {
  vested: { label: 'Кристаллизовано', cls: 'pos' },
  vesting: { label: 'Зреет', cls: 'gold' },
  pending: { label: 'Будущий', cls: 'muted' },
}

export function DesktopOptions() {
  const [data, setData] = useState<OptionsList | null>(null)
  const [form, setForm] = useState<{ existing?: OptionGrant } | null>(null)
  const load = () => void getOptions().then(setData)
  useEffect(load, [])
  const cur = data?.baseCurrency ?? 'USD'

  return (
    <div className="dt-grid c-one">
      <section className="dt-card dt-pad dt-cat-head">
        <div>
          <div className="eyebrow">Всего опционов</div>
          <div className="dt-cap-hero sm">{money(data?.totalBase ?? 0, cur)}</div>
        </div>
        <div className="dt-spacer" />
        {data && (
          <div className="dt-plaques">
            <div><span>В капитале</span><b className="pos">{money(data.vestedBase, cur)}</b></div>
            <div><span>Зреет</span><b>{money(data.vestingBase, cur)}</b></div>
            <div><span>Будущие</span><b>{money(data.pendingBase, cur)}</b></div>
          </div>
        )}
        <button className="dt-btn-brand" onClick={() => setForm({})}>＋ Грант</button>
      </section>

      <section className="dt-card dt-pad dt-act">
        <div className="dt-thead dt-opt-tgrid">
          <span>Грант</span><span className="r">Штук</span><span className="r">Цена</span><span className="r">Стоимость</span><span className="r">Вестинг</span><span className="r">Статус</span><span />
        </div>
        <div className="dt-tbody">
          {data?.grants.map((g) => {
            const st = STATUS[g.status] ?? STATUS.pending
            return (
              <button key={g.id} className="dt-trow dt-opt-tgrid" onClick={() => setForm({ existing: g })}>
                <span className="dt-tc-name"><i style={{ background: '#7A6FF0' }} />{g.name}</span>
                <span className="r muted">{new Intl.NumberFormat('ru-RU').format(g.quantity)}</span>
                <span className="r muted">{money(g.unitPrice, g.currency)}</span>
                <span className="r num">{money(g.valueBase, cur)}</span>
                <span className="r muted">{monthYear(g.vestDate)}</span>
                <span className={`r ${st.cls}`} style={{ fontWeight: 600 }}>{st.label}</span>
                <span className="dt-chev">›</span>
              </button>
            )
          })}
          {data && data.grants.length === 0 && <p className="muted" style={{ padding: '14px 0' }}>Грантов пока нет. Добавь первый.</p>}
        </div>
        <p className="note">Кристаллизованные опционы стали акциями и уже входят в чистый капитал. «Зреет» и «Будущие» попадут в капитал в дату кристаллизации.</p>
      </section>

      {form && <OptionForm existing={form.existing} onCancel={() => setForm(null)} onSaved={() => { setForm(null); load() }} />}
    </div>
  )
}
