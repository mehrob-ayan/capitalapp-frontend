import { useEffect, useState } from 'react'
import { getAssetHistory, getDebtPayments, getLentRepayments, type Asset, type AssetHistory, type AccountEntry } from '../../api'
import { KIND_META, kindColor } from '../../kinds'
import { money, percent, monthYear, duration, dateShort } from '../../format'
import { AreaChart } from '../../components/AreaChart'
import { PaySheet, RepaySheet, TopUpSheet, badgeLine, debtNote } from '../Position'

const VALUE_CHART_KINDS = new Set(['realestate', 'car', 'investment', 'metals'])

function monthsToPayoff(balance: number, annualPct: number, payment: number): number {
  if (payment <= 0) return Infinity
  const i = annualPct / 1200
  if (i <= 0) return Math.ceil(balance / payment)
  if (payment <= balance * i) return Infinity
  return Math.ceil(-Math.log(1 - (balance * i) / payment) / Math.log(1 + i))
}

export function DesktopPosition({ asset, base, onEdit, onDelete, onChanged }: {
  asset: Asset
  base: string
  onEdit: () => void
  onDelete: () => void
  onChanged: () => void
}) {
  void base
  const meta = KIND_META[(asset.kind as keyof typeof KIND_META)] ?? KIND_META.cash
  const cur = asset.currency
  const isDebt = asset.kind === 'debt'
  const isLent = asset.kind === 'lent'
  const isDeposit = asset.kind === 'deposit'
  const loan = asset.metrics.loan
  const accrued = asset.metrics.accruedValue
  const depositBody = isDeposit ? (asset.invested > 0 ? asset.invested : asset.value) : asset.value
  const depositInterest = isDeposit ? accrued - depositBody : 0
  const showValueChart = VALUE_CHART_KINDS.has(asset.kind)

  const [paying, setPaying] = useState(false)
  const [topup, setTopup] = useState(false)
  const [history, setHistory] = useState<AssetHistory | null>(null)
  const [payments, setPayments] = useState<AccountEntry[]>([])

  useEffect(() => { if (showValueChart) void getAssetHistory(asset.id).then(setHistory) }, [asset.id, showValueChart])
  useEffect(() => {
    if (isDebt) void getDebtPayments(asset.id).then(setPayments)
    else if (isLent) void getLentRepayments(asset.id).then(setPayments)
  }, [asset.id, isDebt, isLent])

  const eyebrow = isDebt ? 'Остаток долга сегодня' : isDeposit ? 'Сумма сегодня' : isLent ? 'Ещё вернут' : 'Стоит сейчас'
  const heroVal = isDebt && loan ? loan.outstanding : isDeposit ? accrued : asset.value

  return (
    <div className="dt-grid c-pos">
      <div className="dt-main-col dt-scrollcol">
        <section className="dt-card dt-pad">
          <div className="dt-pos-head">
            <span className="dt-pos-ic" style={{ background: kindColor(asset.kind) }}>{meta.letter}</span>
            <div className="dt-pos-tt">
              <span className="dt-pos-eyebrow">{badgeLine(asset)}</span>
              <span className="dt-pos-nm">{asset.name}</span>
            </div>
            <div className="dt-spacer" />
            {isDebt && <button className="dt-btn-brand" onClick={() => setPaying(true)}>Внести платёж</button>}
            {isLent && <button className="dt-btn-brand" onClick={() => setPaying(true)}>Получить возврат</button>}
            {isDeposit && <button className="dt-btn-brand" onClick={() => setTopup(true)}>Пополнить</button>}
            <button className="dt-btn-ghost" onClick={onEdit}>Изменить</button>
            <button className="dt-btn-ghost danger" onClick={onDelete}>Удалить</button>
          </div>

          <div className="dt-pos-hero-row">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <div className={`dt-cap-hero sm ${isDebt ? 'neg' : isLent ? 'pos' : ''}`}>{isDebt ? '−' : ''}{money(heroVal, cur)}</div>
              {isDeposit && depositInterest > 0 && <div className="dt-cap-delta pos">▲ капитализация +{money(depositInterest, cur)}</div>}
            </div>
            {isDebt && loan && loan.paidMonths + loan.remainingMonths > 0 && (
              <div className="dt-progress-wrap">
                <div className="dt-progress-lbl">выплачено {loan.paidMonths} из {loan.paidMonths + loan.remainingMonths} платежей</div>
                <div className="dt-progress"><span style={{ width: `${(loan.paidMonths / (loan.paidMonths + loan.remainingMonths)) * 100}%` }} /></div>
              </div>
            )}
          </div>
        </section>

        <section className="dt-card dt-pad">
          <div className="dt-card-head"><span className="dt-card-ttl">Параметры</span></div>
          <div className="dt-params">
            {isDebt && loan ? (
              <>
                {loan.monthlyPayment > 0 && <PRow k="Платёж в месяц" v={money(loan.monthlyPayment, cur)} />}
                <PRow k="Ставка" v={asset.ratePercent > 0 ? `${asset.ratePercent}% годовых` : 'без процентов'} />
                {loan.monthlyPayment > 0 && asset.ratePercent > 0 && <PRow k="— проценты" v={money(loan.interestPart, cur)} cls="neg" />}
                {loan.monthlyPayment > 0 && asset.ratePercent > 0 && <PRow k="— тело долга" v={money(loan.principalPart, cur)} cls="pos" />}
                {loan.remainingMonths > 0 && <PRow k="Осталось платить" v={duration(loan.remainingMonths)} />}
                {loan.totalInterest > 0 && <PRow k="Переплата всего" v={money(loan.totalInterest, cur)} cls="neg" />}
                {loan.remainingMonths > 0 && <PRow k="Закрытие" v={monthYear(loan.payoffDate)} />}
              </>
            ) : isLent ? (
              <>
                <PRow k="Дал в долг" v={money(asset.value, cur)} />
                {asset.monthlyPayment > 0 && <PRow k="Возврат в месяц" v={money(asset.monthlyPayment, cur)} cls="pos" />}
              </>
            ) : isDeposit ? (
              <>
                <PRow k="Вложено" v={money(depositBody, cur)} />
                <PRow k="Ставка" v={asset.ratePercent > 0 ? `${asset.ratePercent}% годовых` : 'без процентов'} />
                {depositInterest > 0 && <PRow k="Начислено процентов" v={`+${money(depositInterest, cur)}`} cls="pos" />}
                {asset.ratePercent > 0 && <PRow k="В день" v={`~${money((accrued * asset.ratePercent) / 100 / 365, cur)}`} cls="pos" />}
              </>
            ) : (
              <>
                {asset.invested > 0 && <PRow k="Вложил" v={money(asset.invested, cur)} />}
                <PRow k="Стоит сейчас" v={money(asset.value, cur)} />
                {asset.invested > 0 && <PRow k="Прибыль" v={`${money(asset.metrics.profit, cur)} · ${percent(asset.metrics.profitPercent)}`} cls={asset.metrics.profit >= 0 ? 'pos' : 'neg'} />}
                {asset.monthlyIncome > 0 && <PRow k="Приносит в месяц" v={money(asset.monthlyIncome, cur)} />}
                {asset.metrics.cashYieldPercent > 0 && <PRow k="Кешфлоу" v={`${percent(asset.metrics.cashYieldPercent, false)} годовых`} cls="gold" />}
                {asset.metrics.cagrPercent !== 0 && <PRow k="Доходность" v={`${percent(asset.metrics.cagrPercent)} годовых`} cls="pos" />}
                {asset.maintenanceHours > 0 && <PRow k="Обслуживание" v={`~${asset.maintenanceHours} ч/год`} />}
              </>
            )}
          </div>
        </section>

        {(isDebt || isLent) && payments.length > 0 && (
          <section className="dt-card dt-pad dt-act">
            <div className="dt-card-head"><span className="dt-card-ttl">{isLent ? 'История возвратов' : 'История платежей'}</span></div>
            <div className="dt-tbody">
              {payments.map((p) => (
                <div key={p.id} className="dt-trow dt-hist-grid static">
                  <span className="muted">{dateShort(p.date).split(' ').slice(0, 2).join(' ')}</span>
                  <span>{p.note || (isLent ? 'Возврат' : 'Платёж')}</span>
                  <span className={`r num ${isLent ? 'pos' : 'neg'}`}>{isLent ? '+' : '−'}{money(p.debtAmount ?? p.amount, cur)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="dt-rail">
        {showValueChart && history && history.points.length >= 2 && (
          <section className="dt-card dt-rc">
            <div className="dt-rc-head"><span>Стоимость по месяцам</span></div>
            <AreaChart values={history.points.map((p) => p.value)} />
          </section>
        )}

        {isDebt && loan && (
          <>
            <section className="dt-card dt-rc">
              <div className="dt-rc-head"><span>О долге</span></div>
              <p className="note" style={{ margin: 0 }}>{debtNote(asset, loan.outstanding, cur)}</p>
            </section>
            {loan.monthlyPayment > 0 && asset.ratePercent > 0 && (
              <section className="dt-card dt-rc">
                <div className="dt-rc-head"><span>Если платить больше</span></div>
                {[100, 200, 500].map((extra) => {
                  const base0 = monthsToPayoff(loan.outstanding, asset.ratePercent, loan.monthlyPayment)
                  const m2 = monthsToPayoff(loan.outstanding, asset.ratePercent, loan.monthlyPayment + extra)
                  const saved = base0 - m2
                  if (!Number.isFinite(saved) || saved <= 0) return null
                  return (
                    <div key={extra} className="dt-kv"><span>+{money(extra, cur)} / мес</span><b className="pos">−{duration(saved)}</b></div>
                  )
                })}
                <p className="note">Оценка по остатку и ставке — закрытие быстрее и меньше переплата.</p>
              </section>
            )}
          </>
        )}

        {isLent && (
          <section className="dt-card dt-rc">
            <div className="dt-rc-head"><span>Долг мне</span></div>
            <p className="note" style={{ margin: 0 }}>Тебе должны вернуть эту сумму — она в активах. «Получить возврат»: деньги придут на счёт, а долг тебе уменьшится.</p>
          </section>
        )}
      </div>

      {paying && (isLent
        ? <RepaySheet asset={asset} onClose={() => setPaying(false)} onDone={() => { setPaying(false); onChanged() }} />
        : <PaySheet asset={asset} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); onChanged() }} />
      )}
      {topup && <TopUpSheet asset={asset} onClose={() => setTopup(false)} onDone={() => { setTopup(false); onChanged() }} />}
    </div>
  )
}

function PRow({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return <div className="dt-prow"><span className="dt-prow-k">{k}</span><span className={`dt-prow-v ${cls ?? ''}`}>{v}</span></div>
}
