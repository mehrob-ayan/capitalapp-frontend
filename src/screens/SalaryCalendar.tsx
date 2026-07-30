import { useEffect, useState } from 'react'
import { getSalarySchedule, type SalarySchedule, type SchedMonth, type SchedPayday } from '../api'
import { money } from '../format'
import { TopBar } from '../components/TopBar'

const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// "2026-08-14" → "14.08"
function ddmm(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}
function dayOf(iso: string): number {
  return parseInt(iso.split('-')[2], 10)
}

function MonthCard({ m, currency }: { m: SchedMonth; currency: string }) {
  const first = (new Date(m.year, m.month - 1, 1).getDay() + 6) % 7 // Mon-first index
  const days = new Date(m.year, m.month, 0).getDate()
  const advDay = m.advance ? dayOf(m.advance.date) : -1
  const remDay = m.remainder ? dayOf(m.remainder.date) : -1

  const cells: { day: number; cls: string }[] = []
  for (let i = 0; i < first; i++) cells.push({ day: 0, cls: 'empty' })
  for (let d = 1; d <= days; d++) cells.push({ day: d, cls: d === advDay ? 'adv' : d === remDay ? 'rem' : '' })

  return (
    <article className="salcal-card">
      <h3>{MONTHS_FULL[m.month - 1]} {m.year}</h3>
      <div className="salcal-grid">
        {WD.map((w) => <span key={w} className="salcal-wd">{w}</span>)}
        {cells.map((c, i) => <span key={i} className={`salcal-cell ${c.cls}`}>{c.day || ''}</span>)}
      </div>
      <div className="salcal-pds">
        {m.advance && <PayRow kind="adv" label="Аванс" p={m.advance} currency={currency} />}
        {m.remainder && <PayRow kind="rem" label="Остаток" p={m.remainder} currency={currency} />}
      </div>
    </article>
  )
}

function PayRow({ kind, label, p, currency }: { kind: 'adv' | 'rem'; label: string; p: SchedPayday; currency: string }) {
  return (
    <div className={`salcal-pd ${kind}`}>
      <span>{label} · {ddmm(p.date)}{p.posted ? ' ✓' : ''}</span>
      <b>{money(p.amount, currency)}</b>
    </div>
  )
}

export function SalaryCalendarBody({ data }: { data: SalarySchedule }) {
  if (!data.hasSalary) {
    return (
      <p className="muted empty">
        Укажи месячный доход на экране «Эффективность» — и здесь появится календарь: когда придёт аванс и остаток на весь год вперёд.
        Начисление приходит на зарплатный счёт (заведи его в разделе «Счета»).
      </p>
    )
  }
  return (
    <>
      <p className="salcal-lead">
        Аванс — 15-го (половина зарплаты при полной отработке первой половины месяца, но не больше половины), остаток — в конце месяца.
        Даты с выходных переносятся на пятницу. Суммы в {currencyWord(data.currency)}.
      </p>
      <div className="salcal-sum">
        <div><div className="k">В месяц</div><div className="v">{money(data.monthly, data.currency)}</div></div>
        <div><div className="k">За 12 месяцев</div><div className="v">{money(data.total12, data.currency)}</div></div>
      </div>
      <div className="salcal-legend">
        <span><i className="adv" />Аванс (≈15-го)</span>
        <span><i className="rem" />Остаток (конец месяца)</span>
      </div>
      <div className="salcal-cards">
        {data.months.map((m) => <MonthCard key={`${m.year}-${m.month}`} m={m} currency={data.currency} />)}
      </div>
      <p className="note salcal-note">
        Аванс = половина при нормально отработанной первой половине месяца и никогда не больше половины. Если до 15-го пропустишь рабочие дни — аванс придёт меньше, а остаток в конце месяца добьёт до полной суммы. Прогноз показывает нормальный случай.
      </p>
    </>
  )
}

function currencyWord(c: string): string {
  return c === 'UZS' ? 'сумах' : c === 'TJS' ? 'сомони' : 'долларах'
}

// Mobile wrapper (with back bar). Desktop renders <SalaryCalendarBody> in the shell.
export function SalaryCalendar({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<SalarySchedule | null>(null)
  useEffect(() => { void getSalarySchedule().then(setData) }, [])
  return (
    <div className="pad-screen with-back">
      {onBack ? <TopBar title="Календарь зарплаты" onBack={onBack} /> : <div className="topbar">Календарь зарплаты</div>}
      {!data && <p className="muted">Загрузка…</p>}
      {data && <SalaryCalendarBody data={data} />}
    </div>
  )
}
