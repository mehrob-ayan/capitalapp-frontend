// Backend client. Stores the session token in localStorage so a reload inside
// Telegram (or the browser) stays logged in.

// Empty = same origin (backend serves the built frontend). Dev sets an absolute
// URL via .env so the Vite dev server can reach the Go API on another port.
const API_URL = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'capital_token'

let token: string | null = localStorage.getItem(TOKEN_KEY)

export interface User {
  id: number
  telegramId: number
  firstName?: string
  username?: string
  baseCurrency: string
  autoRates?: boolean
  monthlyIncome?: number
  incomeCurrency?: string
}

export interface LoanState {
  outstanding: number
  monthlyPayment: number
  interestPart: number
  principalPart: number
  paidMonths: number
  remainingMonths: number
  totalInterest: number
  payoffDate: string
}

export interface AssetMetrics {
  valueBase: number
  accruedValue: number
  liabilityBase: number
  monthlyFlowBase: number
  profit: number
  profitBase: number
  profitPercent: number
  cashYieldPercent: number
  cagrPercent: number
  loan?: LoanState
}

export interface Asset {
  id: number
  userId: number
  kind: string
  name: string
  currency: string
  value: number
  invested: number
  monthlyIncome: number
  monthlyPayment: number
  ratePercent: number
  purchaseDate?: string
  maintenanceHours: number
  subtype?: string
  status?: string
  excludeFromNetWorth?: boolean
  isAccount?: boolean
  debtScheme?: string
  loanType?: string
  termMonths?: number
  firstPaymentDate?: string
  payoffDate?: string
  linkedAssetId?: number
  metrics: AssetMetrics
}

export interface AssetInput {
  kind: string
  name: string
  currency: string
  value: number
  invested: number
  monthlyIncome: number
  monthlyPayment: number
  ratePercent: number
  purchaseDate?: string | null
  maintenanceHours: number
  subtype?: string
  status?: string
  excludeFromNetWorth?: boolean
  debtScheme?: string
  loanType?: string
  termMonths?: number
  firstPaymentDate?: string | null
  payoffDate?: string | null
}

export interface CompositionSlice {
  kind: string
  label: string
  valueBase: number
  percent: number
}

export interface CategorySummary {
  kind: string
  label: string
  subtotalBase: number
  count: number
  isLiability: boolean
}

export interface Overview {
  baseCurrency: string
  netWorth: number
  assets: number
  liabilities: number
  monthlyFlow: number
  options: number
  optionsVested: number
  composition: CompositionSlice[]
  categories: CategorySummary[]
}

export async function authTelegram(initData: string): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>('/api/v1/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  })
  token = data.token
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

export const getMe = () => request<User>('/api/v1/me')
export const setBaseCurrency = (baseCurrency: string) =>
  request<User>('/api/v1/me', { method: 'PATCH', body: JSON.stringify({ baseCurrency }) })
export const setAutoRates = (autoRates: boolean) =>
  request<User>('/api/v1/me', { method: 'PATCH', body: JSON.stringify({ autoRates }) })

export const getOverview = () => request<Overview>('/api/v1/overview')
export const getAssets = () => request<Asset[]>('/api/v1/assets')
export const createAsset = (input: AssetInput) =>
  request<Asset>('/api/v1/assets', { method: 'POST', body: JSON.stringify(input) })
export const updateAsset = (id: number, input: AssetInput) =>
  request<Asset>(`/api/v1/assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteAsset = (id: number) =>
  request<void>(`/api/v1/assets/${id}`, { method: 'DELETE' })

export const getRates = () => request<Record<string, number>>('/api/v1/rates')
export const setRates = (rates: Record<string, number>) =>
  request<Record<string, number>>('/api/v1/rates', { method: 'PATCH', body: JSON.stringify({ rates }) })

export interface HistoryPoint { date: string; netWorth: number; assets: number; liabilities: number }
export interface History {
  baseCurrency: string
  points: HistoryPoint[]
  current: number
  changeAbs: number
  changePercent: number
  dailyInterest: number
}
export const getHistory = (period: string, currency?: string) =>
  request<History>(`/api/v1/history?period=${period}${currency ? `&currency=${currency}` : ''}`)

export const setIncome = (monthlyIncome: number, incomeCurrency: string) =>
  request<User>('/api/v1/me', { method: 'PATCH', body: JSON.stringify({ monthlyIncome, incomeCurrency }) })

export interface EffMonth { month: string; growth: number; share: number }
export interface Efficiency {
  baseCurrency: string
  hasIncome: boolean
  monthlyIncome: number
  monthExpenses: number
  capitalGrowth: number
  capitalShare: number
  savingsRate: number | null
  trend: EffMonth[]
}
export const getEfficiency = () => request<Efficiency>('/api/v1/efficiency')

export interface CompositionPoint { date: string; parts: Record<string, number> }
export interface Composition { baseCurrency: string; kinds: string[]; points: CompositionPoint[] }
export const getComposition = (period: string) =>
  request<Composition>(`/api/v1/history/composition?period=${period}`)

export const patchSnapshot = (date: string, netWorth: number) =>
  request<void>(`/api/v1/history/${date}`, { method: 'PATCH', body: JSON.stringify({ netWorth }) })
export const deleteSnapshot = (date: string) =>
  request<void>(`/api/v1/history/${date}`, { method: 'DELETE' })

export interface AssetHistory {
  currency: string
  points: { date: string; value: number }[]
}
export const getAssetHistory = (id: number) => request<AssetHistory>(`/api/v1/assets/${id}/history`)

export interface Goal {
  id: number
  title: string
  targetAmount: number
  currency: string
  monthlyContribution: number
  currentAmount: number
  progressPercent: number
  remaining: number
  monthsToGoal: number | null
}
export interface GoalInput {
  title: string
  targetAmount: number
  currency: string
  monthlyContribution: number
}
export const exportData = () => request<unknown>('/api/v1/export')
export const importData = (payload: unknown) =>
  request<{ status: string }>('/api/v1/import', { method: 'POST', body: JSON.stringify(payload) })

export interface CategorySlice { category: string; amount: number; percent: number }
export interface MonthTrend { month: string; income: number; expense: number }
export interface Transaction {
  id: number
  date: string
  type: string
  category: string
  amount: number
  currency: string
  person: string
  note?: string
  source: string
  createdAt: string
}
export interface Expenses {
  month: string
  currency: string
  income: number
  expense: number
  balance: number
  byCategory: CategorySlice[]
  trend: MonthTrend[]
  people: string[]
  transactions: Transaction[]
}
export interface ExpenseInput {
  type: string
  category: string
  amount: number
  currency: string
  person?: string
  note?: string
}
export const getExpenses = (month: string, person?: string) =>
  request<Expenses>(`/api/v1/expenses?month=${month}${person ? `&person=${encodeURIComponent(person)}` : ''}`)
export const createExpenseTx = (input: ExpenseInput) =>
  request<Transaction>('/api/v1/expenses', { method: 'POST', body: JSON.stringify(input) })
export const deleteExpenseTx = (id: number) =>
  request<void>(`/api/v1/expenses/${id}`, { method: 'DELETE' })
export const getExpenseCategories = () =>
  request<{ expense: string[]; income: string[] }>('/api/v1/expenses/categories')

export interface Activity {
  id: number
  createdAt: string
  kind: string
  title: string
  detail: string
  amount: number
  currency: string
  netBefore: number
  netAfter: number
  changeAbs: number
}
export interface ActivityList {
  baseCurrency: string
  items: Activity[]
}
export const getActivity = () => request<ActivityList>('/api/v1/activity')

export type OptionStatus = 'pending' | 'vesting' | 'vested'
export interface OptionGrant {
  id: number
  name: string
  quantity: number
  unitPrice: number
  currency: string
  grantDate: string
  vestMonths: number
  status: OptionStatus
  vestDate: string
  valueBase: number
}
export interface OptionsList {
  baseCurrency: string
  grants: OptionGrant[]
  vestedBase: number
  vestingBase: number
  pendingBase: number
  totalBase: number
}
export interface OptionInput {
  name: string
  quantity: number
  unitPrice: number
  currency: string
  grantDate: string
  vestMonths: number
}
export const getOptions = () => request<OptionsList>('/api/v1/options')
export const createOption = (o: OptionInput) =>
  request<OptionGrant>('/api/v1/options', { method: 'POST', body: JSON.stringify(o) })
export const updateOption = (id: number, o: OptionInput) =>
  request<OptionGrant>(`/api/v1/options/${id}`, { method: 'PATCH', body: JSON.stringify(o) })
export const deleteOption = (id: number) =>
  request<void>(`/api/v1/options/${id}`, { method: 'DELETE' })

export interface Account { id: number; name: string; currency: string; balance: number; isSalary: boolean }
export interface AccountEntry {
  id: number; accountId: number; date: string; kind: 'income' | 'payment'
  amount: number; note: string; source: string; linkedDebtId?: number; debtAmount?: number; createdAt: string
}
export interface AccountEntries { account: Account; entries: AccountEntry[] }
export interface AccountInput { name: string; currency: string; startingBalance: number; isSalary: boolean }
export interface EntryInput { kind: 'income' | 'payment'; amount: number; note?: string; date?: string }

export const getAccounts = () => request<Account[]>('/api/v1/accounts')
export const createAccount = (a: AccountInput) =>
  request<Account>('/api/v1/accounts', { method: 'POST', body: JSON.stringify(a) })
export const getAccountEntries = (id: number) => request<AccountEntries>(`/api/v1/accounts/${id}/entries`)
export const addAccountEntry = (id: number, e: EntryInput) =>
  request<void>(`/api/v1/accounts/${id}/entries`, { method: 'POST', body: JSON.stringify(e) })
export const updateAccountEntry = (id: number, e: EntryInput) =>
  request<void>(`/api/v1/entries/${id}`, { method: 'PATCH', body: JSON.stringify(e) })
export const deleteAccountEntry = (id: number) => request<void>(`/api/v1/entries/${id}`, { method: 'DELETE' })
export const payDebt = (debtId: number, p: { amount: number; accountId: number; date?: string }) =>
  request<void>(`/api/v1/debts/${debtId}/pay`, { method: 'POST', body: JSON.stringify(p) })
export const getDebtPayments = (debtId: number) => request<AccountEntry[]>(`/api/v1/debts/${debtId}/payments`)

export const getGoals = () => request<Goal[]>('/api/v1/goals')
export const createGoal = (g: GoalInput) => request<Goal>('/api/v1/goals', { method: 'POST', body: JSON.stringify(g) })
export const updateGoal = (id: number, g: GoalInput) => request<Goal>(`/api/v1/goals/${id}`, { method: 'PATCH', body: JSON.stringify(g) })
export const deleteGoal = (id: number) => request<void>(`/api/v1/goals/${id}`, { method: 'DELETE' })

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) detail = body.message
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  // Some endpoints answer 200/201 with an empty body (e.g. a payment). Only
  // parse JSON when there's actually a body, otherwise return undefined — an
  // empty body is a success, not a parse error.
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
