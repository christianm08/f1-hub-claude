import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { jolpica, raceSessions, raceStatus } from '../api/jolpica'
import { sessionsForRace, OPENF1_FIRST_YEAR } from '../api/openf1'
import { normalizeSessionName, type SessionCode } from '../api/openf1model'
import { useApi } from '../hooks/useApi'
import { useSettings } from '../store/settings'
import { MBadge, MButton, MCard, MEmptyState, MSegmentedButton, MTabs, type TabDef } from '../design'
import { Async, DriverLink, PageHead, PageSkeleton, Pos, SkeletonList, TeamBar, fmtDate, fmtDateTime, usePageTitle } from '../components/ui'
import { PracticeTable, QualifyingTable, RaceResultTable } from '../components/ResultTables'
import { TrackMap } from '../components/TrackMap'
import { FlagIcon } from '../components/FlagIcon'
import { countryInfo } from '../data/meta'
import { circuitInfo, fmtLength } from '../data/circuits'
import { ResponsiveTable } from '../components/ResponsiveTable'

type Tab = 'info' | 'race' | 'quali' | 'sprint' | 'practice' | 'standings'

export default function RaceDetail() {
  const { season: sp, round } = useParams()
  const season = Number(sp)
  const { t, locale, units } = useSettings()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'info'
  const setTab = (v: Tab) => setParams({ tab: v }, { replace: true })

  const race = useApi(async () => (await jolpica.schedule(season)).find((r) => r.round === round), [season, round])
  usePageTitle(race.data?.raceName ?? '')

  if (race.status === 'loading' && !race.data) return <PageSkeleton />
  if (race.status === 'error' && !race.data) return <div className="page"><Async state={race}>{() => null}</Async></div>
  const r = race.data
  if (!r) return <div className="page"><MEmptyState icon="flag" title={t('race.notFound')} action={<MButton to="/calendario">{t('nav.calendar')}</MButton>} /></div>

  const st = raceStatus(r)
  const ci = countryInfo(r.Circuit.Location.country)
  const info = circuitInfo(r.Circuit)
  const tabs: TabDef<Tab>[] = [
    { id: 'info', label: t('race.info'), icon: 'info' },
    { id: 'race', label: t('race.race'), icon: 'flag' },
    { id: 'quali', label: t('race.quali'), icon: 'timer' },
    ...(r.Sprint ? [{ id: 'sprint' as Tab, label: t('race.sprint'), icon: 'speed' as const }] : []),
    { id: 'practice', label: t('race.practice'), icon: 'schedule' },
    { id: 'standings', label: t('race.standingsAfter'), icon: 'leaderboard' },
  ]

  return (
    <div className="page">
      <PageHead
        back={`/calendario?season=${season}`}
        title={r.raceName}
        sub={<span className="row row--wrap"><FlagIcon iso2={ci.iso2} code={ci.code} title={r.Circuit.Location.country} />{r.Circuit.circuitName} · {fmtDate(new Date(r.date), locale, { day: 'numeric', month: 'long', year: 'numeric' })} · {t('common.round')} {r.round}</span>}
        tools={
          <div className="row row--wrap">
            {st === 'live' && <MBadge tone="live">{t('live.statusLive')}</MBadge>}
            {season >= OPENF1_FIRST_YEAR && <OpenInRC season={season} date={r.date} />}
          </div>
        }
      />
      <MTabs tabs={tabs} value={tabs.some((x) => x.id === tab) ? tab : 'info'} onChange={setTab} label={r.raceName} />

      {tab === 'info' && (
        <div className="grid grid-2">
          <MCard title={t('race.circuit')}>
            <div className="stack">
              <TrackMap circuitId={r.Circuit.circuitId} />
              <dl className="kv">
                <dt>{t('circuits.locality')}</dt><dd>{r.Circuit.Location.locality}, {r.Circuit.Location.country}</dd>
                <dt>{t('circuits.length')}</dt><dd>{fmtLength(info.lengthM, units, locale) ?? t('common.na')}</dd>
                <dt>{t('circuits.turns')}</dt><dd>{t('common.na')}</dd>
                <dt>{t('circuits.lapRecord')}</dt><dd>{t('common.na')}</dd>
                <dt>{t('circuits.coords')}</dt><dd className="mono">{Number(r.Circuit.Location.lat).toFixed(4)}, {Number(r.Circuit.Location.long).toFixed(4)}</dd>
              </dl>
              {info.hasTrack && <p className="note">{t('circuits.trackSource')}</p>}
            </div>
          </MCard>
          <MCard title={t('race.schedule')}>
            <ul className="m3-list">
              {raceSessions(r).map((s) => {
                const past = s.start.getTime() < Date.now()
                return (
                  <li key={s.kind} className="m3-list-item" style={{ opacity: past ? 0.7 : 1 }}>
                    <div className="m3-list-item__main">
                      <div className="m3-title-small">{t(`session.${s.kind}`)}</div>
                      <div className="m3-body-small m3-muted">{fmtDateTime(s.start, locale)}</div>
                    </div>
                    {past && <MBadge>{t('cal.past')}</MBadge>}
                  </li>
                )
              })}
            </ul>
            <p className="note">{t('race.localTime')}</p>
          </MCard>
        </div>
      )}
      {tab === 'race' && <RaceTab season={season} round={r.round} />}
      {tab === 'quali' && <QualiTab season={season} round={r.round} />}
      {tab === 'sprint' && <SprintTab season={season} round={r.round} />}
      {tab === 'practice' && <PracticeTab season={season} date={r.date} sprint={!!r.Sprint} />}
      {tab === 'standings' && <StandingsAfter season={season} round={r.round} done={st === 'past'} />}
    </div>
  )
}

function OpenInRC({ season, date }: { season: number; date: string }) {
  const { t } = useSettings()
  const s = useApi((signal) => sessionsForRace(season, date, signal), [season, date])
  const race = s.data?.find((x) => normalizeSessionName(x.session_name) === 'RACE') ?? s.data?.[s.data.length - 1]
  if (!race) return null
  return <MButton variant="brand" icon="sensors" to={`/live?session=${race.session_key}`}>{t('race.openInRaceCenter')}</MButton>
}

function RaceTab({ season, round }: { season: number; round: string }) {
  const { t } = useSettings()
  const s = useApi(() => jolpica.raceResults(season, round), [season, round])
  return (
    <MCard>
      <Async state={s} skeleton={<SkeletonList rows={12} />} isEmpty={(r) => !r?.Results?.length} emptyTitle={t('race.notYet')}>
        {(r) => <RaceResultTable results={r!.Results!} season={season} caption={t('race.race')} />}
      </Async>
    </MCard>
  )
}

function SprintTab({ season, round }: { season: number; round: string }) {
  const { t } = useSettings()
  const s = useApi(() => jolpica.sprint(season, round), [season, round])
  return (
    <MCard>
      <Async state={s} skeleton={<SkeletonList rows={12} />} isEmpty={(r) => !r?.SprintResults?.length} emptyTitle={t('race.notYet')}>
        {(r) => <RaceResultTable results={r!.SprintResults!} season={season} caption={t('race.sprint')} />}
      </Async>
    </MCard>
  )
}

function QualiTab({ season, round }: { season: number; round: string }) {
  const { t } = useSettings()
  const s = useApi(() => jolpica.qualifying(season, round), [season, round])
  return (
    <MCard>
      <Async state={s} skeleton={<SkeletonList rows={12} />} isEmpty={(r) => !r?.QualifyingResults?.length} emptyTitle={t('race.notYet')}>
        {(r) => <QualifyingTable results={r!.QualifyingResults!} season={season} caption={t('race.quali')} />}
      </Async>
    </MCard>
  )
}

function PracticeTab({ season, date, sprint }: { season: number; date: string; sprint: boolean }) {
  const { t } = useSettings()
  const opts: SessionCode[] = sprint ? ['FP1'] : ['FP1', 'FP2', 'FP3']
  const [code, setCode] = useState<SessionCode>('FP1')
  return (
    <MCard>
      <div className="stack">
        {opts.length > 1 && <MSegmentedButton label={t('race.practice')} value={code} onChange={setCode} options={opts.map((o) => ({ value: o, label: o }))} />}
        <PracticeTable season={season} raceDate={date} code={code} />
      </div>
    </MCard>
  )
}

function StandingsAfter({ season, round, done }: { season: number; round: string; done: boolean }) {
  const { t } = useSettings()
  const s = useApi(async () => {
    const [d, c] = await Promise.all([jolpica.driverStandings(season, round), jolpica.constructorStandings(season, round)])
    return { d, c }
  }, [season, round], done)
  if (!done) return <MEmptyState icon="hourglass_empty" title={t('race.notYet')} />
  return (
    <Async state={s} skeleton={<SkeletonList rows={10} />} isEmpty={(x) => !x.d.length}>
      {({ d, c }) => (
        <div className="grid grid-2">
          <MCard title={t('standings.drivers')}>
            <ResponsiveTable
              caption={t('standings.drivers')}
              rows={d}
              rowKey={(r) => r.Driver.driverId}
              columns={[
                { key: 'p', header: t('common.pos'), cell: (r) => <Pos p={r.positionText} />, width: 52 },
                { key: 'd', header: t('common.driver'), cell: (r) => <span className="row"><TeamBar id={r.Constructors.at(-1)?.constructorId} /><DriverLink d={r.Driver} season={season} /></span> },
                { key: 'w', header: t('common.wins'), cell: (r) => r.wins, num: true },
                { key: 'pt', header: t('common.pts'), cell: (r) => <b>{r.points}</b>, num: true },
              ]}
              mobile={{ lead: (r) => <Pos p={r.positionText} />, main: (r) => <DriverLink d={r.Driver} season={season} />, trail: (r) => <b>{r.points}</b> }}
            />
          </MCard>
          <MCard title={t('standings.constructors')}>
            <ResponsiveTable
              caption={t('standings.constructors')}
              rows={c}
              rowKey={(r) => r.Constructor.constructorId}
              columns={[
                { key: 'p', header: t('common.pos'), cell: (r) => <Pos p={r.positionText} />, width: 52 },
                { key: 't', header: t('common.team'), cell: (r) => <span className="row"><TeamBar id={r.Constructor.constructorId} />{r.Constructor.name}</span> },
                { key: 'w', header: t('common.wins'), cell: (r) => r.wins, num: true },
                { key: 'pt', header: t('common.pts'), cell: (r) => <b>{r.points}</b>, num: true },
              ]}
              mobile={{ lead: (r) => <Pos p={r.positionText} />, main: (r) => <span className="row"><TeamBar id={r.Constructor.constructorId} />{r.Constructor.name}</span>, trail: (r) => <b>{r.points}</b> }}
            />
          </MCard>
        </div>
      )}
    </Async>
  )
}
