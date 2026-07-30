import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  authTelegram, deleteAsset, getAssets, getMe, getOverview, setBaseCurrency, getActivity,
  type Asset, type Overview, type User,
} from './api'
import { signedMoney } from './format'
import { showNotify, getLastSeen, setLastSeen, notifyEnabled } from './notify'
import { tg, isInsideTelegram, setBackButton, haptic } from './telegram'
import { KIND_META, type Kind } from './kinds'
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
import { AccountsScreen } from './screens/AccountsScreen'
import { Expenses } from './screens/Expenses'
import { BottomNav, type Tab } from './components/BottomNav'
import { TopBar } from './components/TopBar'
import { DesktopOverview } from './screens/DesktopOverview'
import { DesktopShell, type NavKey } from './components/DesktopShell'
import { DesktopHistory } from './screens/desktop/DesktopHistory'
import { DesktopExpenses } from './screens/desktop/DesktopExpenses'
import { DesktopAccounts } from './screens/desktop/DesktopAccounts'
import { DesktopCategory } from './screens/desktop/DesktopCategory'
import { DesktopPosition } from './screens/desktop/DesktopPosition'
import { DesktopGoals } from './screens/desktop/DesktopGoals'
import { DesktopOptions } from './screens/desktop/DesktopOptions'
import { DesktopEfficiency } from './screens/desktop/DesktopEfficiency'
import { DesktopActivity } from './screens/desktop/DesktopActivity'
import { DesktopSettings } from './screens/desktop/DesktopSettings'
import { nowTime } from './screens/desktop/shared'
import { useIsDesktop } from './useMediaQuery'

type Route = { name: Tab } | { name: 'goals' } | { name: 'options' } | { name: 'activity' } | { name: 'efficiency' } | { name: 'accounts' } | { name: 'account'; id: number } | { name: 'category'; kind: Kind } | { name: 'position'; id: number }

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
  const isDesktop = useIsDesktop()
  const [expSub, setExpSub] = useState('операции за месяц')

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

  // Poll the activity log while the app is open and notify only about things
  // that happen WITHOUT you — salary auto-credit and the daily rate sync. Your
  // own manual actions aren't pushed (you just did them).
  useEffect(() => {
    if (phase !== 'ready') return
    const AUTO_KINDS = new Set(['salary', 'rate_changed'])
    let stopped = false
    async function poll() {
      if (!notifyEnabled()) return
      try {
        const { items, baseCurrency } = await getActivity()
        if (!items.length) return
        const newest = items[0].id // API returns newest-first
        const last = getLastSeen()
        if (last === 0) { setLastSeen(newest); return } // baseline: don't spam on first run
        const fresh = items.filter((a) => a.id > last && AUTO_KINDS.has(a.kind)).reverse()
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
    if (route.name === 'account') return setRoute({ name: 'category', kind: 'cash' })
    if (route.name === 'category') return setRoute({ name: 'home' })
    if (route.name === 'goals') return setRoute({ name: 'more' })
    if (route.name === 'options') return setRoute({ name: 'more' })
    if (route.name === 'activity') return setRoute({ name: 'more' })
    if (route.name === 'efficiency') return setRoute({ name: 'more' })
    if (route.name === 'accounts') return setRoute({ name: 'more' })
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

  const overlays = (
    <>
      {chooser && <AddChooser onPick={openAdd} onClose={() => setChooser(false)} />}
      {form && (
        <AssetForm
          kind={form.kind}
          existing={form.existing}
          onCancel={() => setForm(null)}
          onSaved={() => { setForm(null); void reload() }}
        />
      )}
    </>
  )

  // On desktop the whole app lives in a persistent shell (sidebar + header);
  // the mobile column/tab-bar is untouched below 900px.
  if (isDesktop) {
    const base = data.overview.baseCurrency
    const navTo: Record<NavKey, Route> = {
      home: { name: 'home' }, history: { name: 'history' }, expenses: { name: 'expenses' },
      accounts: { name: 'accounts' }, goals: { name: 'goals' }, options: { name: 'options' },
      efficiency: { name: 'efficiency' }, activity: { name: 'activity' }, settings: { name: 'more' },
    }
    const positionAsset = route.name === 'position' ? data.assets.find((a) => a.id === route.id) : undefined

    let active: NavKey | null = null
    let title = ''
    let subtitle: string | undefined
    let onBack: (() => void) | undefined
    let content: ReactNode = null

    switch (route.name) {
      case 'home':
        active = 'home'; title = 'Обзор'; subtitle = `обновлено сегодня в ${nowTime()}`
        content = (
          <DesktopOverview
            overview={data.overview} assets={data.assets}
            onOpenCategory={(k) => { haptic(); setRoute({ name: 'category', kind: k as Kind }) }}
            onOpenAsset={(id) => { haptic(); setRoute({ name: 'position', id }) }}
            onOpenAccounts={() => setRoute({ name: 'accounts' })}
            onOpenOptions={() => setRoute({ name: 'options' })}
            onOpenGoals={() => setRoute({ name: 'goals' })}
            onOpenActivity={() => setRoute({ name: 'activity' })}
          />
        )
        break
      case 'history':
        active = 'history'; title = 'Динамика'; subtitle = 'снимки капитала за каждый день'
        content = <DesktopHistory base={base} />
        break
      case 'expenses':
        active = 'expenses'; title = 'Расходы'; subtitle = expSub
        content = <DesktopExpenses onMeta={setExpSub} />
        break
      case 'accounts':
      case 'account':
        active = 'accounts'; title = 'Счета'; subtitle = 'счета и движения'
        content = <DesktopAccounts initialAccountId={route.name === 'account' ? route.id : undefined} onChanged={() => void reload()} />
        break
      case 'goals':
        active = 'goals'; title = 'Цели'
        content = <DesktopGoals />
        break
      case 'options':
        active = 'options'; title = 'Опционы'
        content = <DesktopOptions />
        break
      case 'efficiency':
        active = 'efficiency'; title = 'Эффективность'; subtitle = 'доход, расходы и прирост капитала'
        content = <DesktopEfficiency />
        break
      case 'activity':
        active = 'activity'; title = 'Действия'; subtitle = 'журнал изменений капитала'
        content = <DesktopActivity />
        break
      case 'more':
        active = 'settings'; title = 'Настройки'; subtitle = 'валюта, курсы, автоматизация, данные'
        content = <DesktopSettings baseCurrency={base} onChangeCurrency={changeCurrency} onRatesSaved={() => void reload()} />
        break
      case 'category':
        active = 'home'; title = `Обзор / ${KIND_META[route.kind].label}`; onBack = back
        content = (
          <DesktopCategory
            kind={route.kind} assets={data.assets} base={base}
            onOpenAsset={(id) => { haptic(); setRoute({ name: 'position', id }) }}
            onOpenAccount={(id) => { haptic(); setRoute({ name: 'account', id }) }}
            onAdd={openAdd}
          />
        )
        break
      case 'position':
        active = 'home'; onBack = back
        title = positionAsset ? `${KIND_META[positionAsset.kind as Kind]?.label ?? 'Позиция'} / ${positionAsset.name}` : 'Позиция'
        content = positionAsset
          ? <DesktopPosition asset={positionAsset} base={base} onEdit={() => setForm({ kind: positionAsset.kind as Kind, existing: positionAsset })} onDelete={() => removeAsset(positionAsset.id)} onChanged={() => { void reload(); back() }} />
          : <p className="muted">Позиция не найдена.</p>
        break
    }

    return (
      <>
        <DesktopShell
          active={active} title={title} subtitle={subtitle} onBack={onBack}
          base={base} onChangeCurrency={changeCurrency} user={data.user}
          onNav={(k) => setRoute(navTo[k])}
          onAdd={openAdd}
          onExpenseAdd={() => { setRoute({ name: 'expenses' }); setExpenseAdd((n) => n + 1) }}
          onPayDebt={() => setRoute({ name: 'category', kind: 'debt' })}
          onOpenChooser={() => setChooser(true)}
        >
          {content}
        </DesktopShell>
        {overlays}
      </>
    )
  }

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
          onOpenAccount={(id) => { haptic(); setRoute({ name: 'account', id }) }}
          onAdd={openAdd}
        />
      )}

      {route.name === 'position' && <PositionRoute data={data} id={route.id} onBack={back} onEdit={(a) => setForm({ kind: a.kind as Kind, existing: a })} onDelete={removeAsset} onChanged={() => void reload()} />}

      {route.name === 'expenses' && <Expenses addSignal={expenseAdd} />}
      {route.name === 'history' && <HistoryScreen baseCurrency={data.overview.baseCurrency} onChangeCurrency={changeCurrency} />}
      {route.name === 'goals' && <Goals onBack={back} />}
      {route.name === 'options' && <OptionsScreen onBack={back} />}
      {route.name === 'activity' && <ActivityScreen onBack={back} />}
      {route.name === 'efficiency' && <EfficiencyScreen onBack={back} />}
      {route.name === 'accounts' && <AccountsScreen onBack={back} onChanged={() => void reload()} />}
      {route.name === 'account' && <AccountsScreen initialAccountId={route.id} onBack={back} onChanged={() => void reload()} />}

      {route.name === 'more' && (
        <Settings
          baseCurrency={data.overview.baseCurrency}
          onChangeCurrency={changeCurrency}
          onRatesSaved={() => void reload()}
          onOpenGoals={() => setRoute({ name: 'goals' })}
          onOpenOptions={() => setRoute({ name: 'options' })}
          onOpenActivity={() => setRoute({ name: 'activity' })}
          onOpenEfficiency={() => setRoute({ name: 'efficiency' })}
          onOpenAccounts={() => setRoute({ name: 'accounts' })}
        />
      )}

      {isTopLevel && (
        <BottomNav
          active={route.name as Tab}
          onTab={(t) => setRoute({ name: t })}
          onAdd={() => { haptic(); route.name === 'expenses' ? setExpenseAdd((n) => n + 1) : setChooser(true) }}
        />
      )}

      {overlays}
    </main>
  )
}

function PositionRoute({ data, id, onBack, onEdit, onDelete, onChanged }: {
  data: Data
  id: number
  onBack: () => void
  onEdit: (a: Asset) => void
  onDelete: (id: number) => void
  onChanged: () => void
}) {
  const asset = data.assets.find((a) => a.id === id)
  if (!asset) {
    return <div className="pad-screen with-back"><TopBar title="Позиция" onBack={onBack} /><p className="muted">Позиция не найдена.</p></div>
  }
  return <Position asset={asset} onBack={onBack} onEdit={() => onEdit(asset)} onDelete={() => onDelete(asset.id)} onChanged={onChanged} />
}
