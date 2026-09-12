// The four headline metrics on the overview, each with its own history view on
// the Динамика screen. `pending` lets an overview tile preselect a metric before
// navigating there; the history screen reads it once on mount and clears it.
export type HistMetric = 'capital' | 'assets' | 'liabilities' | 'interest' | 'flow'

export const METRIC_LABEL: Record<HistMetric, string> = {
  capital: 'Капитал',
  assets: 'Активы',
  liabilities: 'Обязательства',
  interest: 'Проценты',
  flow: 'Поток',
}

export const pendingMetric: { key: HistMetric | null } = { key: null }
