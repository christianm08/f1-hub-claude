import { useMemo, useState } from 'react'
import { jolpica, nextSession, raceSessions, raceStatus, type RaceStatus } from '../api/jolpica'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MBadge, MCard, MChip, MEmptyState, MIcon, MSelect } from '../design'
import { Async, Nat, PageHead, SkeletonCards, fmtDate, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { FlagIcon } from '../components/FlagIcon'
import { TrackMap } from '../components/TrackMap'
import { CONTINENTS, countryInfo, type Continent } from '../data/meta'

export default function Calendar() {
  const { t, locale } = useSettings()
  usePageTitle(t('cal.title'))
  const [season, setSeason] = useSeasonParam()
  const [month, setMonth] = useState<number | 'all'>('all')
  const [continent, setContinent] = useState<Continent | 'all'>('all')
  const [state, setState] = useState<RaceStatus | 'all'>('all')

  const data = useApi(async () => {
    const [races, winners] = await Promise.all([jolpica.schedule(season), jolpica.seasonWinners(season).catch(() => [])])
    const winByRound = new Map(winners.map((w) => [w.round, w.Results?.[0]]))
    return { races, winByRound }
  }, [season])

  const months = useMemo(() => [...new Set((data.data?.races ?? []).map((r) => new Date(r.date).getMonth()))], [data.data])
  const next = data.data ? nextSession(data.data.races) : null

  return (
    <div className="page">
      <PageHead title={t('cal.title')} sub={`${t('common.season')} ${season} · ${t('race.localTime')}`} tools={<SeasonSelect value={season} onChange={setSeason} />} />
      <div className="filters">
        <MSelect label={t('cal.month')} value={String(month)} onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{t('cal.allMonths')}</option>
          {months.map((m) => <option key={m} value={m}>{new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2020, m, 1))}</option>)}
        </MSelect>
        <MSelect label={t('cal.continent')} value={continent} onChange={(e) => setContinent(e.target.value as Continent | 'all')}>
          <option value="all">{t('common.all')}</option>
          {CONTINENTS.map((c) => <option key={c} value={c}>{t(`continent.${c}`)}</option>)}
        </MSelect>
      </div>
      <div className="m3-chip-row" role="group" aria-label={t('cal.state')}>
        {(['all', 'upcoming', 'live', 'past'] as const).map((s) => (
          <MChip key={s} selected={state === s} onClick={() => setState(s)}>{s === 'all' ? t('common.all') : t(`cal.${s}`)}</MChip>
        ))}
      </div>
      <Async state={data} skeleton={<SkeletonCards n={9} h={200} />} isEmpty={(d) => !d.races.length}>
        {({ races, winByRound }) => {
          const list = races.filter((r) => {
            const st = raceStatus(r)
            if (state !== 'all' && st !== state) return false
            if (month !== 'all' && new Date(r.date).getMonth() !== month) return false
            if (continent !== 'all' && countryInfo(r.Circuit.Location.country).continent !== continent) return false
            return true
          })
          if (!list.length) return <MEmptyState icon="filter_list" title={t('cal.noMatch')} />
          return (
            <div className="grid grid-cards">
              {list.map((r) => {
                const st = raceStatus(r)
                const ci = countryInfo(r.Circuit.Location.country)
                const sess = raceSessions(r)
                const first = sess[0]?.start
                const win = winByRound.get(r.round)
                const isNext = next?.race.round === r.round
                return (
                  <MCard key={r.round} to={`/gara/${r.season}/${r.round}`} className={`race-card${st === 'past' ? ' is-past' : ''}${isNext ? ' is-next' : ''}`} aria-label={r.raceName}>
                    <div className="race-card__top">
                      <span className="race-card__round">R{r.round.padStart(2, '0')}</span>
                      <FlagIcon iso2={ci.iso2} code={ci.code} title={r.Circuit.Location.country} />
                      <span className="grow" />
                      {st === 'live' && <MBadge tone="live">{t('live.statusLive')}</MBadge>}
                      {r.Sprint && <MBadge tone="tertiary">Sprint</MBadge>}
                    </div>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <div className="grow stack" style={{ gap: 2 }}>
                        <h2 className="m3-title-large" style={{ margin: 0 }}>{r.raceName.replace(' Grand Prix', ' GP')}</h2>
                        <span className="m3-body-small m3-muted ellipsis">{r.Circuit.circuitName}</span>
                        <span className="m3-label-large" style={{ marginTop: 6 }}>
                          {first && first.toDateString() !== new Date(r.date).toDateString() ? `${fmtDate(first, locale)} – ` : ''}{fmtDate(new Date(r.date), locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ width: 92, flex: 'none' }}><TrackMap circuitId={r.Circuit.circuitId} stroke={18} showStart={false} /></div>
                    </div>
                    {st === 'past' && (
                      <div className="row m3-body-medium" style={{ paddingTop: 8, borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                        <MIcon name="trophy" size={18} style={{ color: '#d4a72c' }} />
                        {win ? <span className="row" style={{ gap: 6 }}><Nat nationality={win.Driver.nationality} /><span>{win.Driver.givenName} <b>{win.Driver.familyName}</b></span></span> : <span className="m3-muted">{t('race.notYet')}</span>}
                        {win && <span className="m3-body-small m3-muted ellipsis">· {win.Constructor.name}</span>}
                      </div>
                    )}
                  </MCard>
                )
              })}
            </div>
          )
        }}
      </Async>
    </div>
  )
}
