// Tabelle risultati condivise (Gara/Sprint, Qualifiche, Prove) — DNF/DNS/DSQ con posizione e stato reali.

import { resultFlag, type QualifyingResult, type RaceResult } from '../api/jolpica'
import { openf1, sessionsForRace, OPENF1_FIRST_YEAR } from '../api/openf1'
import { bestLaps, fmtLap, normalizeSessionName, teamHex, type SessionCode } from '../api/openf1model'
import { useApi } from '../hooks/useApi'
import { useSettings } from '../store/settings'
import { MBadge, MEmptyState, MIcon } from '../design'
import { Async, DriverLink, Pos, SkeletonList, TeamBar } from './ui'
import { ResponsiveTable } from './ResponsiveTable'
import { FlagIcon } from './FlagIcon'
import { FIA_TO_ISO2 } from '../data/meta'

function StatusCell({ r }: { r: RaceResult }) {
  const f = resultFlag(r)
  if (f) return <span className="row" style={{ gap: 6 }}><MBadge tone={f === 'DSQ' ? 'error' : undefined}>{f}</MBadge><span className="m3-body-small m3-muted">{r.status}</span></span>
  return <span className="mono">{r.Time?.time ?? r.status}</span>
}

export function RaceResultTable({ results, season, caption }: { results: RaceResult[]; season: number; caption: string }) {
  const { t } = useSettings()
  return (
    <ResponsiveTable
      caption={caption}
      rows={results}
      rowKey={(r) => r.Driver.driverId}
      columns={[
        { key: 'pos', header: t('common.pos'), cell: (r) => <Pos p={r.positionText} />, width: 52 },
        { key: 'drv', header: t('common.driver'), cell: (r) => <span className="row"><TeamBar id={r.Constructor.constructorId} /><DriverLink d={r.Driver} season={season} showCode /></span> },
        { key: 'team', header: t('common.team'), cell: (r) => r.Constructor.name },
        { key: 'grid', header: t('common.grid'), cell: (r) => (r.grid === '0' ? 'PL' : r.grid ?? '—'), num: true },
        { key: 'laps', header: t('common.laps'), cell: (r) => r.laps, num: true },
        { key: 'time', header: `${t('common.time')} / ${t('common.status')}`, cell: (r) => <StatusCell r={r} /> },
        { key: 'fl', header: t('common.fastestLap'), cell: (r) => r.FastestLap?.Time?.time ? <span className="row mono" style={{ gap: 4 }}>{r.FastestLap.rank === '1' && <MIcon name="timer" size={16} style={{ color: '#a35cff' }} label={t('common.fastestLap')} />}{r.FastestLap.Time.time}</span> : '—' },
        { key: 'pts', header: t('common.pts'), cell: (r) => <b>{r.points}</b>, num: true },
      ]}
      mobile={{
        lead: (r) => <Pos p={r.positionText} />,
        main: (r) => <><div className="row"><TeamBar id={r.Constructor.constructorId} /><DriverLink d={r.Driver} season={season} /></div><div className="m3-body-small m3-muted">{r.Constructor.name}</div></>,
        trail: (r) => <><div className="m3-body-small"><StatusCell r={r} /></div><b className="m3-body-small">{r.points} {t('common.pts')}</b></>,
      }}
    />
  )
}

export function QualifyingTable({ results, season, caption }: { results: QualifyingResult[]; season: number; caption: string }) {
  const { t } = useSettings()
  return (
    <ResponsiveTable
      caption={caption}
      rows={results}
      rowKey={(r) => r.Driver.driverId}
      columns={[
        { key: 'pos', header: t('common.pos'), cell: (r) => <Pos p={r.position} />, width: 52 },
        { key: 'drv', header: t('common.driver'), cell: (r) => <span className="row"><TeamBar id={r.Constructor.constructorId} /><DriverLink d={r.Driver} season={season} showCode /></span> },
        { key: 'team', header: t('common.team'), cell: (r) => r.Constructor.name },
        { key: 'q1', header: 'Q1', cell: (r) => <span className="mono">{r.Q1 || '—'}</span> },
        { key: 'q2', header: 'Q2', cell: (r) => <span className="mono">{r.Q2 || '—'}</span> },
        { key: 'q3', header: 'Q3', cell: (r) => <span className="mono">{r.Q3 || '—'}</span> },
      ]}
      mobile={{
        lead: (r) => <Pos p={r.position} />,
        main: (r) => <><div className="row"><TeamBar id={r.Constructor.constructorId} /><DriverLink d={r.Driver} season={season} /></div><div className="m3-body-small m3-muted">{r.Constructor.name}</div></>,
        trail: (r) => <span className="mono m3-body-small">{r.Q3 || r.Q2 || r.Q1 || '—'}</span>,
      }}
    />
  )
}

/** Best lap delle prove libere via OpenF1 (dal 2023). */
export function PracticeTable({ season, raceDate, code }: { season: number; raceDate: string; code: SessionCode }) {
  const { t } = useSettings()
  const state = useApi(
    async (signal) => {
      const sessions = await sessionsForRace(season, raceDate, signal)
      const s = sessions.find((x) => normalizeSessionName(x.session_name) === code)
      if (!s) return { sessionKey: null, rows: [] as ReturnType<typeof bestLaps> }
      const [drivers, laps] = await Promise.all([openf1.drivers(s.session_key, { signal }), openf1.laps({ session_key: s.session_key }, { signal, ttl: 7 * 86_400_000 })])
      const uniq = [...new Map(drivers.map((d) => [d.driver_number, d])).values()]
      return { sessionKey: s.session_key, rows: bestLaps(uniq, laps).filter((r) => r.best != null) }
    },
    [season, raceDate, code],
    season >= OPENF1_FIRST_YEAR,
  )
  if (season < OPENF1_FIRST_YEAR) return <MEmptyState icon="timer" title={t('race.practiceUnavailable')} />
  return (
    <Async state={state} skeleton={<SkeletonList rows={10} />} isEmpty={(d) => !d.rows.length} emptyTitle={t('race.practiceNone')}>
      {(d) => (
        <div className="stack">
          <ResponsiveTable
            caption={code}
            rows={d.rows}
            rowKey={(r) => String(r.driver.driver_number)}
            columns={[
              { key: 'pos', header: t('common.pos'), cell: (_r, i) => <Pos p={i + 1} />, width: 52 },
              { key: 'drv', header: t('common.driver'), cell: (r) => <span className="row"><TeamBar color={teamHex(r.driver)} /><FlagIcon iso2={FIA_TO_ISO2[r.driver.country_code ?? '']} code={r.driver.country_code ?? '—'} /><b>{r.driver.full_name}</b><span className="code3">{r.driver.name_acronym}</span></span> },
              { key: 'team', header: t('common.team'), cell: (r) => r.driver.team_name },
              { key: 'best', header: t('common.best'), cell: (r) => <span className="mono">{fmtLap(r.best)}</span> },
              { key: 'gap', header: t('common.gap'), cell: (r) => <span className="mono">{r.gap ? `+${r.gap.toFixed(3)}` : '—'}</span>, num: true },
              { key: 'laps', header: t('common.laps'), cell: (r) => r.laps, num: true },
            ]}
            mobile={{
              lead: (_r, i) => <Pos p={i + 1} />,
              main: (r) => <><div className="row"><TeamBar color={teamHex(r.driver)} /><b>{r.driver.full_name}</b></div><div className="m3-body-small m3-muted">{r.driver.team_name}</div></>,
              trail: (r) => <><div className="mono">{fmtLap(r.best)}</div><div className="mono m3-body-small m3-muted">{r.gap ? `+${r.gap.toFixed(3)}` : ''}</div></>,
            }}
          />
          <p className="note">{t('common.source')}: OpenF1</p>
        </div>
      )}
    </Async>
  )
}
