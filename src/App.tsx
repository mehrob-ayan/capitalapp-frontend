import { useCallback, useEffect, useState } from 'react'
import {
  authTelegram, deleteAsset, getAssets, getMe, getOverview, setBaseCurrency, getActivity,
  type Asset, type Overview, type User,
} from './api'
import { signedMoney } from './format'
import { showNotify, getLastSeen, setLastSeen, notifyEnabled } from './notify'
import { tg, isInsideTelegram, setBackButton, haptic } from './telegram'
import type { Kind } from './kinds'
import { Dashboard } from './screens/Dashboard'
import { Category } from './screens/Category'
import { Position } from './screens/Position'
import { AddChooser } from './screens/AddChooser'
import { AssetForm } from './screens/AssetForm'
import { Settings } from './screens/Settings'
import { HistoryScreen } from './screens/HistoryScreen'
import { Goals } from './screens/Goals'
import { OptionsScreen } from './screens/OptionsScreen'
import { ActivityScreen } from './screens/ActivityScreen'
import { EfficiencyScreen } from './screens/EfficiencyScreen'
import { Expenses } from './screens/Expenses'
import { BottomNav, type Tab } from './components/BottomNav'
import { TopBar } from './components/TopBar'

type Route = { name: Tab } | { name: 'goals' } | { name: 'options' } | { name: 'activity' } | { name: 'efficiency' } | { name: 'category'; kind: Kind } | { name: 'position'; id: number }

// Persist the current screen so a page refresh doesn't jump back to Overview.
const ROUTE_KEY = 'capital_route'
function loadRoute(): Route {
  try {
    const r = JSON.parse(localStorage.getItem(ROUTE_KEY) ?? 'null')
    if (r && typeof r.name === 'string') return r as Route
  } catch {
    /* ignore */
  }
  return { name: 'home' }
}

interface Data {
  user: User
  overview: Overview
  assets: Asset[]
}

export default function App() {
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [error, setError] = useState('')
  const [data, setData] = useState<Data | null>(null)
  const [route, setRoute] = useState<Route>(loadRoute)
  const [chooser, setChooser] = useState(false)
  const [expenseAdd, setExpenseAdd] = useState(0)
  const [form, setForm] = useState<{ kind: Kind; existing?: Asset } | null>(null)

  useEffect(() => {
    localStorage.setItem(ROUTE_KEY, JSON.stringify(route))
  }, [route])

  const reload = useCallback(async () => {
    const [overview, assets, user] = await Promise.all([getOverview(), getAssets(), getMe()])
    setData({ overview, assets, user })
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await authTelegram(tg?.initData ?? '')
        await reload()
        setPhase('ready')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
        setPhase('error')
      }
    })()
  }, [reload])

  // Poll the activity log while the app is open and raise a browser
  // notification for each new entry — a change, or the morning auto rate-sync.
  useEffect(() => {
    if (phase !== 'ready') return
    let stopped = false
    async function poll() {
      if (!notifyEnabled()) return
      try {
        const { items, baseCurrency } = await getActivity()
        if (!items.length) return
        const newest = items[0].id // API returns newest-first
        const last = getLastSeen()
        if (last === 0) { setLastSeen(newest); return } // baseline: don't spam on first run
        const fresh = items.filter((a) => a.id > last).reverse()
        for (const a of fresh) {
          const chg = a.changeAbs !== 0 ? ` (${signedMoney(a.changeAbs, baseCurrency)})` : ''
          showNotify(a.title, `${a.detail}${chg}`.trim())
        }
        setLastSeen(newest)
      } catch {
        /* offline / transient — ignore */
      }
    }
    void poll()
    const t = setInterval(() => { if (!stopped) void poll() }, 60_000)
    return () => { stopped = true; clearInterval(t) }
  }, [phase])

  const isTopLevel = route.name === 'home' || route.name === 'expenses' || route.name === 'history' || route.name === 'more'

  const back = useCallback(() => {
    if (form) return setForm(null)
    if (chooser) return setChooser(false)
    if (route.name === 'position') {
      const a = data?.assets.find((x) => x.id === route.id)
      return setRoute(a ? { name: 'category', kind: a.kind as Kind } : { name: 'home' })
    }
    if (route.name === 'category') return setRoute({ name: 'home' })
    if (route.name === 'goals') return setRoute({ name: 'more' })
    if (route.name === 'options') return setRoute({ name: 'more' })
    if (route.name === 'activity') return setRoute({ name: 'more' })
    if (route.name === 'efficiency') return setRoute({ name: 'more' })
  }, [form, chooser, route, data])

  useEffect(() => {
    const canBack = Boolean(form) || chooser || !isTopLevel
    setBackButton(canBack ? back : null)
  }, [form, chooser, isTopLevel, back])

  async function changeCurrency(c: string) {
    if (!data || c === data.overview.baseCurrency) return
    await setBaseCurrency(c)
    await reload()
  }

  async function removeAsset(id: number) {
    if (!window.confirm('Удалить эту позицию?')) return
    const a = data?.assets.find((x) => x.id === id)
    await deleteAsset(id)
    await reload()
    setRoute(a ? { name: 'category', kind: a.kind as Kind } : { name: 'home' })
  }

  if (phase === 'loading') return <main className="screen"><p className="muted">Загрузка…</p></main>
  if (phase === 'error') {
    return (
      <main className="screen">
        <h1>Не удалось войти</h1>
        <p className="muted">{error}</p>
        {!isInsideTelegram() && (
          <p className="muted">Открыто вне Telegram. Для локального входа включите на сервере <code>ALLOW_DEV_LOGIN=true</code>.</p>
        )}
      </main>
    )
  }
  if (!data) return null

  const openAdd = (kind: Kind) => { haptic(); setChooser(false); setForm({ kind }) }

  return (
    <main className="screen">
      {route.name === 'home' && (
        <Dashboard
          overview={data.overview}
          onOpenCategory={(kind) => { haptic(); setRoute({ name: 'category', kind: kind as Kind }) }}
          onOpenOptions={() => { haptic(); setRoute({ name: 'options' }) }}
          onOpenActivity={() => { haptic(); setRoute({ name: 'activity' }) }}
          onChangeCurrency={changeCurrency}
        />
      )}

      {route.name === 'category' && (
        <Category
          kind={route.kind}
          assets={data.assets}
          baseCurrency={data.overview.baseCurrency}
          onBack={back}
          onOpenAsset={(id) => { haptic(); setRoute({ name: 'position', id }) }}
          onAdd={openAdd}
        />
      )}

      {route.name === 'position' && <PositionRoute data={data} id={route.id} onBack={back} onEdit={(a) => setForm({ kind: a.kind as Kind, existing: a })} onDelete={removeAsset} />}

      {route.name === 'expenses' && <Expenses addSignal={expenseAdd} />}
      {route.name === 'history' && <HistoryScreen baseCurrency={data.overview.baseCurrency} onChangeCurrency={changeCurrency} />}
      {route.name === 'goals' && <Goals onBack={back} />}
      {route.name === 'options' && <OptionsScreen onBack={back} />}
      {route.name === 'activity' && <ActivityScreen onBack={back} />}
      {route.name === 'efficiency' && <EfficiencyScreen onBack={back} />}

      {route.name === 'more' && (
        <Settings
          baseCurrency={data.overview.baseCurrency}
          onChangeCurrency={changeCurrency}
          onRatesSaved={() => void reload()}
          onOpenGoals={() => setRoute({ name: 'goals' })}
          onOpenOptions={() => setRoute({ name: 'options' })}
          onOpenActivity={() => setRoute({ name: 'activity' })}
          onOpenEfficiency={() => setRoute({ name: 'efficiency' })}
        />
      )}

      {isTopLevel && (
        <BottomNav
          active={route.name as Tab}
          onTab={(t) => setRoute({ name: t })}
          onAdd={() => { haptic(); route.name === 'expenses' ? setExpenseAdd((n) => n + 1) : setChooser(true) }}
        />
      )}

      {chooser && <AddChooser onPick={openAdd} onClose={() => setChooser(false)} />}
      {form && (
        <AssetForm
          kind={form.kind}
          existing={form.existing}
          onCancel={() => setForm(null)}
          onSaved={() => { setForm(null); void reload() }}
        />
      )}
    </main>
  )
}

function PositionRoute({ data, id, onBack, onEdit, onDelete }: {
  data: Data
  id: number
  onBack: () => void
  onEdit: (a: Asset) => void
  onDelete: (id: number) => void
}) {
  const asset = data.assets.find((a) => a.id === id)
  if (!asset) {
    return <div className="pad-screen with-back"><TopBar title="Позиция" onBack={onBack} /><p className="muted">Позиция не найдена.</p></div>
  }
  return <Position asset={asset} onBack={onBack} onEdit={() => onEdit(asset)} onDelete={() => onDelete(asset.id)} />
}
