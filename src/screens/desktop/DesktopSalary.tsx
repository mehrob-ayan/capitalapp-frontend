import { useEffect, useState } from 'react'
import { getSalarySchedule, type SalarySchedule } from '../../api'
import { SalaryCalendarBody } from '../SalaryCalendar'

export function DesktopSalary() {
  const [data, setData] = useState<SalarySchedule | null>(null)
  useEffect(() => { void getSalarySchedule().then(setData) }, [])
  return (
    <div className="dt-scrollcol dt-full salcal-desk">
      {!data && <p className="muted">Загрузка…</p>}
      {data && <SalaryCalendarBody data={data} />}
    </div>
  )
}
