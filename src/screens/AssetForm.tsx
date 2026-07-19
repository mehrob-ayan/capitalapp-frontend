import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { CURRENCIES, DEBT_SCHEMES, FORM_FIELDS, KIND_META, type DebtScheme, type Field, type Kind } from '../kinds'
import { symbol } from '../format'
import { createAsset, updateAsset, type Asset, type AssetInput } from '../api'

const DEBT_NAME_FIELD = FORM_FIELDS.debt[0]

export function AssetForm({
  kind,
  existing,
  onCancel,
  onSaved,
}: {
  kind: Kind
  existing?: Asset
  onCancel: () => void
  onSaved: () => void
}) {
  const isDebt = kind === 'debt'
  const [scheme, setScheme] = useState<DebtScheme>((existing?.debtScheme as DebtScheme) || 'accruing')
  const schemeDef = DEBT_SCHEMES.find((s) => s.value === scheme) ?? DEBT_SCHEMES[0]

  const fields: Field[] = isDebt ? [DEBT_NAME_FIELD, ...schemeDef.fields] : FORM_FIELDS[kind]

  const [currency, setCurrency] = useState(existing?.currency ?? 'TJS')
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields, existing, isDebt ? scheme : undefined))
  const [exclude, setExclude] = useState(existing?.excludeFromNetWorth ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }))

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const input = { ...toInput(kind, currency, values, isDebt ? scheme : undefined), excludeFromNetWorth: exclude }
      if (existing) await updateAsset(existing.id, input)
      else await createAsset(input)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
      setSaving(false)
    }
  }

  const meta = KIND_META[kind]
  return (
    <Sheet
      title={existing ? 'Изменить' : meta.label}
      subtitle={meta.isLiability ? 'Уменьшает капитал' : 'Увеличивает капитал'}
      onClose={onCancel}
    >
      <div className="fld">
        <label>Валюта</label>
        <div className="seg">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" className={c === currency ? 'on' : ''} onClick={() => setCurrency(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {isDebt && <FieldRow field={DEBT_NAME_FIELD} value={values.name ?? ''} currency={currency} onChange={(v) => set('name', v)} />}

      {isDebt && (
        <div className="fld">
          <label>Вид кредита</label>
          <div className="scheme-list">
            {DEBT_SCHEMES.map((s) => (
              <button key={s.value} type="button" className={`scheme-opt ${s.value === scheme ? 'on' : ''}`} onClick={() => setScheme(s.value)}>
                <b>{s.label}</b>
                <small>{s.desc}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {(isDebt ? schemeDef.fields : fields).map((f) => (
        <FieldRow key={f.key} field={f} value={values[f.key] ?? ''} currency={currency} onChange={(v) => set(f.key, v)} />
      ))}

      <div className="soon-row" style={{ marginTop: 16 }}>
        <div className="rate-l">
          Учитывать в чистом капитале
          <small>выкл — видно в разделе, но не в чистом капитале</small>
        </div>
        <button
          type="button"
          className={`switch ${!exclude ? 'on' : ''}`}
          onClick={() => setExclude((v) => !v)}
          aria-pressed={!exclude}
          aria-label="Учитывать в чистом капитале"
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="mainbtn" disabled={saving} onClick={submit}>
        {saving ? 'Сохранение…' : existing ? 'Сохранить' : 'Добавить'}
      </button>
    </Sheet>
  )
}

function FieldRow({
  field,
  value,
  currency,
  onChange,
}: {
  field: Field
  value: string
  currency: string
  onChange: (v: string) => void
}) {
  const hint = 'hint' in field && field.hint ? <span className="hint"> · {field.hint}</span> : null

  if (field.type === 'segment') {
    return (
      <div className="fld">
        <label>{field.label}</label>
        <div className="seg">
          {field.options.map((o) => (
            <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fld">
      <label>{field.label}{hint}</label>
      <div className="inp-wrap">
        {field.type === 'money' && <span className="inp-pre">{symbol(currency)}</span>}
        <input
          className={field.type === 'money' ? 'inp big' : 'inp'}
          type={field.type === 'text' ? 'text' : field.type === 'month' ? 'month' : 'number'}
          inputMode={field.type === 'money' || field.type === 'number' ? 'decimal' : undefined}
          placeholder={field.type === 'text' ? field.placeholder : field.type === 'month' ? '' : '0'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.type === 'number' && 'suffix' in field && field.suffix && <span className="inp-suf">{field.suffix}</span>}
      </div>
    </div>
  )
}

function initialValues(fields: Field[], existing: Asset | undefined, scheme?: DebtScheme): Record<string, string> {
  const v: Record<string, string> = {}
  const rec = existing ? (existing as unknown as Record<string, unknown>) : null
  for (const f of fields) {
    if (f.type === 'segment') {
      v[f.key] = rec ? String(rec[f.key] ?? f.options[0].value) : f.options[0].value
    } else if (f.type === 'month') {
      v[f.key] = rec ? isoToMonth(rec[f.key] as string | undefined) : ''
    } else if (f.type === 'text') {
      v[f.key] = existing?.name ?? ''
    } else if (f.key === 'value' && scheme === 'accruing' && existing?.metrics.loan) {
      // Accruing debt: pre-fill today's grown balance so re-saving keeps interest.
      v[f.key] = String(Math.round(existing.metrics.loan.outstanding))
    } else {
      const raw = rec ? rec[f.key] : undefined
      v[f.key] = raw ? String(raw) : ''
    }
  }
  return v
}

function toInput(kind: Kind, currency: string, values: Record<string, string>, scheme?: DebtScheme): AssetInput {
  const num = (k: string) => {
    const n = parseFloat(values[k] ?? '')
    return Number.isFinite(n) ? n : 0
  }
  const str = (k: string) => values[k]?.trim() || ''
  const monthOrNull = (k: string) => (values[k] ? values[k] : null)

  return {
    kind,
    name: str('name') || KIND_META[kind].label,
    currency,
    value: num('value'),
    invested: num('invested'),
    monthlyIncome: num('monthlyIncome'),
    monthlyPayment: num('monthlyPayment'),
    ratePercent: num('ratePercent'),
    maintenanceHours: num('maintenanceHours'),
    termMonths: Math.round(num('termMonths')),
    purchaseDate: monthOrNull('purchaseDate'),
    firstPaymentDate: monthOrNull('firstPaymentDate'),
    subtype: str('subtype') || undefined,
    status: str('status') || undefined,
    debtScheme: scheme,
  }
}

function isoToMonth(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
