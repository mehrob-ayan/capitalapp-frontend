import { useCallback, useEffect, useState } from 'react'
import {
  authTelegram, deleteAsset, getAssets, getMe, getOverview, setBaseCurrency,
  type Asset, type Overview, type User,
} from './api'
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
import { BottomNav, type Tab } from './components/BottomNav'
import { TopBar } from './components/TopBar'

type Route = { name: Tab } | { name: 'category'; kind: Kind } | { name: 'position'; id: number }

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

  const isTopLevel = route.name === 'home' || route.name === 'history' || route.name === 'goals' || route.name === 'more'

  const back = useCallback(() => {
    if (form) return setForm(null)
    if (chooser) return setChooser(false)
    if (route.name === 'position') {
      const a = data?.assets.find((x) => x.id === route.id)
      return setRoute(a ? { name: 'category', kind: a.kind as Kind } : { name: 'home' })
    }
    if (route.name === 'category') return setRoute({ name: 'home' })
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

      {route.name === 'history' && <HistoryScreen />}
      {route.name === 'goals' && <Goals />}

      {route.name === 'more' && (
        <Settings
          baseCurrency={data.overview.baseCurrency}
          onChangeCurrency={changeCurrency}
          onRatesSaved={() => void reload()}
        />
      )}

      {isTopLevel && (
        <BottomNav
          active={route.name as Tab}
          onTab={(t) => setRoute({ name: t })}
          onAdd={() => { haptic(); setChooser(true) }}
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
