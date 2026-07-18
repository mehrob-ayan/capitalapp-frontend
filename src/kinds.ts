// Central definition of asset kinds: presentation metadata and the
// progressive form fields shown when adding/editing each kind. Jargon
// (subtype, loan type) lives only on the kinds that need it.

export type Kind = 'realestate' | 'car' | 'deposit' | 'cash' | 'investment' | 'debt'

export interface KindMeta {
  label: string
  example: string
  letter: string
  color: string
  isLiability?: boolean
}

export const KIND_META: Record<Kind, KindMeta> = {
  realestate: { label: 'Недвижимость', example: 'квартира, дом, участок', letter: 'Д', color: '#2F8F7E' },
  car: { label: 'Транспорт', example: 'машина, мотоцикл', letter: 'Т', color: '#B5793A' },
  deposit: { label: 'Вклад', example: 'вклад, накопительный счёт', letter: 'В', color: '#7FB39C' },
  cash: { label: 'Наличные и счета', example: 'кэш, карта, счёт', letter: 'Н', color: '#C6A254' },
  investment: { label: 'Инвестиции', example: 'акции, облигации, фонды', letter: 'И', color: '#3E8C79' },
  debt: { label: 'Кредит или долг', example: 'кредит, рассрочка, ипотека', letter: 'К', color: '#BF5030', isLiability: true },
}

export function kindColor(kind: string): string {
  return (KIND_META as Record<string, KindMeta>)[kind]?.color ?? '#8A99A8'
}

// Chooser groups: common categories first, investing separated out so the
// typical user (deposit / car / mortgage) never meets stock jargon by default.
export const CHOOSER_PRIMARY: Kind[] = ['realestate', 'car', 'deposit', 'cash', 'debt']
export const CHOOSER_ADVANCED: Kind[] = ['investment']

export type Field =
  | { key: 'name'; type: 'text'; label: string; placeholder: string }
  | { key: string; type: 'money'; label: string; hint?: string }
  | { key: string; type: 'number'; label: string; hint?: string; suffix?: string }
  | { key: string; type: 'month'; label: string; hint?: string }
  | { key: string; type: 'segment'; label: string; options: { value: string; label: string }[] }

export const FORM_FIELDS: Record<Kind, Field[]> = {
  realestate: [
    { key: 'name', type: 'text', label: 'Название', placeholder: 'Напр. квартира на Арбате' },
    { key: 'status', type: 'segment', label: 'Статус', options: [
      { value: 'own', label: 'Живу сам' },
      { value: 'rented', label: 'Сдаётся' },
    ] },
    { key: 'value', type: 'money', label: 'Стоит сейчас' },
    { key: 'invested', type: 'money', label: 'Вложил', hint: 'цена покупки + ремонт' },
    { key: 'monthlyIncome', type: 'money', label: 'Доход от аренды в месяц', hint: 'если сдаёте' },
    { key: 'purchaseDate', type: 'month', label: 'Дата покупки', hint: 'для доходности' },
    { key: 'maintenanceHours', type: 'number', label: 'Обслуживание', hint: 'часов в год', suffix: 'ч' },
  ],
  car: [
    { key: 'name', type: 'text', label: 'Название', placeholder: 'Напр. Toyota Camry' },
    { key: 'value', type: 'money', label: 'Стоит сейчас' },
    { key: 'invested', type: 'money', label: 'Купил за' },
    { key: 'purchaseDate', type: 'month', label: 'Дата покупки', hint: 'для доходности' },
    { key: 'maintenanceHours', type: 'number', label: 'Обслуживание', hint: 'часов в год', suffix: 'ч' },
  ],
  deposit: [
    { key: 'name', type: 'text', label: 'Название', placeholder: 'Напр. вклад в банке' },
    { key: 'value', type: 'money', label: 'Сумма' },
    { key: 'ratePercent', type: 'number', label: 'Ставка', hint: '% годовых', suffix: '%' },
  ],
  cash: [
    { key: 'name', type: 'text', label: 'Название', placeholder: 'Напр. текущий счёт' },
    { key: 'value', type: 'money', label: 'Сумма' },
  ],
  investment: [
    { key: 'name', type: 'text', label: 'Название', placeholder: 'Напр. Apple, фонд на S&P 500' },
    { key: 'subtype', type: 'segment', label: 'Тип', options: [
      { value: 'stock', label: 'Акции' },
      { value: 'bond', label: 'Облигации' },
      { value: 'fund', label: 'Фонд' },
    ] },
    { key: 'value', type: 'money', label: 'Стоит сейчас' },
    { key: 'invested', type: 'money', label: 'Вложил', hint: 'для расчёта прибыли' },
    { key: 'monthlyIncome', type: 'money', label: 'Дивиденды в месяц', hint: 'если есть' },
    { key: 'purchaseDate', type: 'month', label: 'Дата покупки', hint: 'для доходности' },
  ],
  // Debt shows a scheme picker (see DEBT_SCHEMES); only the name lives here.
  debt: [{ key: 'name', type: 'text', label: 'Название', placeholder: 'Напр. ипотека, рассрочка, займ' }],
}

export type DebtScheme = 'accruing' | 'annuity' | 'differentiated' | 'interestfree'

const RATE_FIELD: Field = { key: 'ratePercent', type: 'number', label: 'Ставка', hint: '% годовых', suffix: '%' }
const PAYMENT_FIELD: Field = { key: 'monthlyPayment', type: 'money', label: 'Платёж в месяц', hint: 'если платите' }
const TERM_FIELD: Field = { key: 'termMonths', type: 'number', label: 'Срок', hint: 'в месяцах', suffix: 'мес' }
const FIRST_FIELD: Field = { key: 'firstPaymentDate', type: 'month', label: 'Первый платёж' }

// Loan products a user can pick to match their bank. Each drives a different
// server-side calculation of the outstanding balance over time.
export const DEBT_SCHEMES: { value: DebtScheme; label: string; desc: string; fields: Field[] }[] = [
  {
    value: 'accruing',
    label: 'Растёт каждый день',
    desc: 'Проценты капают ежедневно на остаток, платёж вносите сами',
    fields: [{ key: 'value', type: 'money', label: 'Остаток долга сейчас' }, RATE_FIELD, PAYMENT_FIELD],
  },
  {
    value: 'annuity',
    label: 'Аннуитетный',
    desc: 'Равный платёж по графику, остаток уменьшается сам',
    fields: [{ key: 'value', type: 'money', label: 'Сумма кредита' }, RATE_FIELD, TERM_FIELD, FIRST_FIELD],
  },
  {
    value: 'differentiated',
    label: 'Дифференцированный',
    desc: 'Равное тело долга, платёж со временем убывает',
    fields: [{ key: 'value', type: 'money', label: 'Сумма кредита' }, RATE_FIELD, TERM_FIELD, FIRST_FIELD],
  },
  {
    value: 'interestfree',
    label: 'Без процентов',
    desc: 'Рассрочка или частный долг — без начислений',
    fields: [{ key: 'value', type: 'money', label: 'Остаток долга' }, PAYMENT_FIELD],
  },
]

export const CURRENCIES = ['USD', 'TJS', 'UZS'] as const
