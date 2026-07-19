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
  debtScheme?: string
  loanType?: string
  termMonths?: number
  firstPaymentDate?: string
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

export interface HistoryPoint { date: string; netWorth: number }
export interface History {
  baseCurrency: string
  points: HistoryPoint[]
  current: number
  changeAbs: number
  changePercent: number
}
export const getHistory = (period: string) => request<History>(`/api/v1/history?period=${period}`)

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
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
