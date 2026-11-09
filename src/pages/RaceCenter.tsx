import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRaceCenterSession } from '../api/openf1live'
import { useSettings } from '../store/settings'
import { MBadge, MButton, MCard, MChip, MEmptyState, MErrorState, MIcon, MLinearProgress, MSkeleton, MTabs, type TabDef } from '../design'
import { PageHead, fmtDateTime, usePageTitle } from '../components/ui'
import { useMedia } from '../components/ResponsiveTable'
import { SessionBrowser } from '../components/racecenter/SessionBrowser'
import {
  DriverPanel, FlagBanner, LapTiming, PitTimeline, RaceControlPanel, StrategyView, TimingTower, UnifiedTimeline, WeatherPanel,
  isRaceLikeSession, useTower,
} from '../components/racecenter/core'

// Pannelli avanzati: montati solo quando la loro tab è attiva (risparmio di budget API)
const CircuitMapPanel = lazy(() => import('../components/racecenter/CircuitMapPanel'))
const TelemetryPanel = lazy(() => import('../components/racecenter/TelemetryPanel'))
const TeamRadioPanel = lazy(() => import('../components/racecenter/TeamRadioPanel'))
const ReplayPanel = lazy(() => import('../components/racecenter/ReplayPanel'))
const ComparePanel = lazy(() => import('../components/racecenter/ComparePanel'))

type DTab = 'events' | 'map' | 'strategy' | 'pits' | 'laps' | 'telemetry' | 'radio' | 'replay' | 'compare'
type MTab = 'timing' | 'map' | 'events' | 'tyres' | 'replay' | 'radio' | 'weather' | 'driver' | 'more'
type MoreTab = 'laps' | 'pits' | 'telemetry' | 'compare'

export default function RaceCenter() {
  const { t, autoRefresh, locale } = useSettings()
  usePageTitle(t('live.title'))
  const [params, setParams] = useSearchParams()
  const sessionKey = Number(params.get('session')) || null
  const pick = useCallback((k: number) => setParams({ session: String(k) }, { replace: false }), [setParams])

  const rc = useRaceCenterSession(sessionKey, { autoRefresh })
  const [at, setAt] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [dTab, setDTab] = useState<DTab>('events')
  const [mTab, setMTab] = useState<MTab>('timing')
  const [more, setMore] = useState<MoreTab>('laps')
  const mobile = useMedia('(max-width: 1099px)')

  const data = rc.data
  const tower = useTower(data, at)
  const drivers = useMemo(() => new Map(data.drivers.map((d) => [d.driver_number, d])), [data.drivers])
  const selRow = tower.find((r) => r.driver.driver_number === selected) ?? null
  const raceLike = isRaceLikeSession(data.session?.session_name)
  const ready = (rc.status === 'ready' || rc.status === 'live') && !!data.session

  // reset replay e selezione quando cambia sessione
  const [lastKey, setLastKey] = useState(sessionKey)
  if (lastKey !== sessionKey) {
    setLastKey(sessionKey)
    setAt(null)
    setSelected(null)
  }

  const fallback = <MSkeleton h={320} r="24px 24px 24px 8px" />
  const panel = (id: DTab | MoreTab) => {
    if (!data.session) return null
    switch (id) {
      case 'events': return <div className="stack"><UnifiedTimeline data={data} at={at} drivers={drivers} /><RaceControlPanel data={data} at={at} /></div>
      case 'map': return <Suspense fallback={fallback}><CircuitMapPanel data={data} at={at} selected={selected} /></Suspense>
      case 'strategy': return <StrategyView data={data} rows={tower} />
      case 'pits': return <PitTimeline data={data} at={at} drivers={drivers} />
      case 'laps': return <LapTiming data={data} at={at} driver={selRow?.driver ?? null} />
      case 'telemetry': return <Suspense fallback={fallback}><TelemetryPanel data={data} at={at} driver={selected} /></Suspense>
      case 'radio': return <Suspense fallback={fallback}><TeamRadioPanel data={data} at={at} driver={selected} /></Suspense>
      case 'replay': return <Suspense fallback={fallback}><ReplayPanel session={data.session} at={at} onChange={setAt} /></Suspense>
      case 'compare': return <Suspense fallback={fallback}><ComparePanel data={data} at={at} initial={selected} /></Suspense>
    }
  }

  const dTabs: TabDef<DTab>[] = [
    { id: 'events', label: t('live.tab.events'), icon: 'timeline' },
    { id: 'map', label: t('live.tab.map'), icon: 'map' },
    { id: 'strategy', label: t('live.tab.strategy'), icon: 'tire_repair' },
    { id: 'pits', label: t('live.tab.pits'), icon: 'build' },
    { id: 'laps', label: t('live.tab.laps'), icon: 'timer' },
    { id: 'telemetry', label: t('live.tab.telemetry'), icon: 'speed' },
    { id: 'radio', label: t('live.tab.radio'), icon: 'radio' },
    { id: 'replay', label: t('live.tab.replay'), icon: 'replay' },
    { id: 'compare', label: t('live.tab.compare'), icon: 'compare_arrows' },
  ]
  const mTabs: TabDef<MTab>[] = [
    { id: 'timing', label: t('live.tab.timing'), icon: 'table_rows' },
    { id: 'map', label: t('live.tab.map'), icon: 'map' },
    { id: 'events', label: t('live.tab.events'), icon: 'timeline' },
    { id: 'tyres', label: t('live.tab.tyres'), icon: 'tire_repair' },
    { id: 'replay', label: t('live.tab.replay'), icon: 'replay' },
    { id: 'radio', label: t('live.tab.radio'), icon: 'radio' },
    { id: 'weather', label: t('live.tab.weather'), icon: 'thermostat' },
    { id: 'driver', label: t('live.tab.driver'), icon: 'person' },
    { id: 'more', label: t('live.tab.more'), icon: 'more_horiz' },
  ]

  const selectDriver = (n: number) => setSelected((s) => (s === n ? null : n))

  return (
    <div className="page rc">
      <PageHead
        title={t('live.title')}
        sub={data.session ? `${data.session.country_name} · ${data.session.circuit_short_name} · ${data.session.session_name} · ${fmtDateTime(new Date(data.session.date_start), locale)}` : t('live.idleHint')}
        tools={rc.status === 'live' ? <MBadge tone="live">{t('live.statusLive')}</MBadge> : rc.status === 'ready' ? <MBadge>{t('live.statusReplay')}</MBadge> : undefined}
      />
      <MCard><SessionBrowser current={sessionKey} onPick={pick} /></MCard>

      {rc.status === 'idle' && <MEmptyState icon="sensors" title={t('live.idleTitle')} text={t('live.idleHint')} />}
      {rc.status === 'loading' && (
        <MCard>
          <div className="stack">
            <span className="m3-title-medium">{t('live.loadingSession')}</span>
            <MLinearProgress label={t('live.loadingSession')} />
            <p className="note">{t('live.rateNote')}</p>
          </div>
        </MCard>
      )}
      {rc.status === 'error' && <MErrorState title={t('common.error')} text={rc.error ?? t('common.errorHint')} onRetry={rc.reload} retryLabel={t('common.retry')} />}
      {rc.status === 'needsSubscription' && (
        <section className="subscription" role="status">
          <span className="row"><MIcon name="lock" /><MBadge tone="live">{t('live.statusLive')}</MBadge></span>
          <h2 className="m3-headline-small">{t('live.needsSub')}</h2>
          <p className="m3-body-medium">{t('live.needsSubHint')}</p>
          <div><MButton variant="outlined" href="https://openf1.org" icon="open_in_new">openf1.org</MButton></div>
        </section>
      )}

      {ready && (
        <>
          <div className="rc-toolbar glass-race">
            <MIcon name={rc.status === 'live' ? 'sensors' : 'history'} />
            <span className="m3-label-large">{at ? `${t('live.replayAt')}: ${new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(at))}` : rc.status === 'live' ? t('live.statusLive') : t('live.sessionEnded')}</span>
            <span className="grow" />
            {at && <MButton variant="text" size="sm" icon="skip_next" onClick={() => setAt(null)}>{t('live.end')}</MButton>}
            {rc.lastUpdate && <span className="m3-body-small m3-muted">{t('live.lastUpdate')} {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(rc.lastUpdate))}{rc.revalidations ? ` · ${rc.revalidations} ${t('live.revalidated')}` : ''}</span>}
          </div>
          <FlagBanner data={data} at={at} />

          {mobile ? (
            <div className="stack">
              <MTabs tabs={mTabs} value={mTab} onChange={setMTab} label={t('live.title')} />
              {mTab === 'timing' && <MCard><TimingTower rows={tower} selected={selected} onSelect={(n) => { selectDriver(n); }} raceLike={raceLike} /></MCard>}
              {mTab === 'map' && panel('map')}
              {mTab === 'events' && panel('events')}
              {mTab === 'tyres' && <div className="stack"><StrategyView data={data} rows={tower} /><PitTimeline data={data} at={at} drivers={drivers} /></div>}
              {mTab === 'replay' && panel('replay')}
              {mTab === 'radio' && panel('radio')}
              {mTab === 'weather' && <WeatherPanel data={data} at={at} />}
              {mTab === 'driver' && <DriverPanel row={selRow} data={data} />}
              {mTab === 'more' && (
                <div className="stack">
                  <div className="m3-chip-row">
                    {(['laps', 'pits', 'telemetry', 'compare'] as MoreTab[]).map((m) => <MChip key={m} selected={more === m} onClick={() => setMore(m)}>{t(`live.tab.${m}`)}</MChip>)}
                  </div>
                  {panel(more)}
                </div>
              )}
            </div>
          ) : (
            <div className="rc-grid">
              <div className="rc-col">
                <MCard title={t('live.tab.timing')}><TimingTower rows={tower} selected={selected} onSelect={selectDriver} raceLike={raceLike} /></MCard>
                <DriverPanel row={selRow} data={data} />
                <WeatherPanel data={data} at={at} />
              </div>
              <div className="rc-col">
                <MTabs tabs={dTabs} value={dTab} onChange={setDTab} label={t('live.title')} />
                {panel(dTab)}
              </div>
            </div>
          )}
          <p className="note">{t('common.source')}: OpenF1 · {t('live.rateNote')}</p>
        </>
      )}
    </div>
  )
}
