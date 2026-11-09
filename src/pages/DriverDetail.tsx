import { useParams } from 'react-router-dom'
import { jolpica, driverName, resultFlag, type Race } from '../api/jolpica'
import { driverProfile } from '../api/model'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MButton, MCard, MEmptyState, MFavButton, MBadge } from '../design'
import { Async, Nat, PageHead, PageSkeleton, Pos, SkeletonList, SrcVal, TeamBar, fmtDate, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { DriverPhoto } from '../components/DriverPhoto'
import { Sparkline } from '../components/charts'
import { ResponsiveTable } from '../components/ResponsiveTable'
import { natInfo, teamColor } from '../data/meta'

export default function DriverDetail() {
  const { driverId = '' } = useParams()
  const [season, setSeason] = useSeasonParam()
  const { t, locale, isFavorite, toggleFavorite } = useSettings()

  const s = useApi(async () => {
    const [results, quali, sprint, standings] = await Promise.all([
      jolpica.driverResults(season, driverId),
      jolpica.driverQualifying(season, driverId).catch(() => [] as Race[]),
      jolpica.driverSprint(season, driverId).catch(() => [] as Race[]),
      jolpica.driverStandings(season).catch(() => []),
    ])
    const driver = results[0]?.Results?.[0]?.Driver ?? standings.find((x) => x.Driver.driverId === driverId)?.Driver ?? (await jolpica.driver(driverId))
    if (!driver) return null
    const profile = await driverProfile(driver, season)
    return { driver, profile, results, quali, sprint, standing: standings.find((x) => x.Driver.driverId === driverId) }
  }, [season, driverId])
  usePageTitle(s.data ? driverName(s.data.driver) : t('drivers.title'))

  if (!s.data && s.status === 'loading') return <PageSkeleton />

  return (
    <div className="page">
      <Async state={s} skeleton={<PageSkeleton />} isEmpty={(d) => !d} emptyTitle={t('drivers.notFound')}>
        {(d) => {
          const { driver, profile, results, quali, sprint, standing } = d!
          const team = results.at(-1)?.Results?.[0]?.Constructor ?? standing?.Constructors.at(-1)
          const color = teamColor(team?.constructorId)
          const rows = results.map((r) => ({ race: r, res: r.Results![0], sprintPts: Number(sprint.find((sp) => sp.round === r.round)?.SprintResults?.[0]?.points ?? 0), q: quali.find((q) => q.round === r.round)?.QualifyingResults?.[0] }))
          const wins = rows.filter((r) => r.res.position === '1').length
          const podiums = rows.filter((r) => Number(r.res.position) <= 3 && /^\d+$/.test(r.res.positionText)).length
          const poles = quali.filter((q) => q.QualifyingResults?.[0]?.position === '1').length
          const dnfs = rows.filter((r) => resultFlag(r.res) === 'DNF').length
          const totalPts = standing ? Number(standing.points) : rows.reduce((a, r) => a + Number(r.res.points) + r.sprintPts, 0)
          let acc = 0
          const trend = rows.map((r) => ({ label: r.race.Circuit.Location.country.slice(0, 3).toUpperCase(), value: (acc += Number(r.res.points) + r.sprintPts) }))
          const best = rows.reduce<number | null>((b, r) => (/^\d+$/.test(r.res.positionText) && (b === null || Number(r.res.position) < b) ? Number(r.res.position) : b), null)
          const nat = natInfo(driver.nationality)
          return (
            <>
              <PageHead back={`/piloti?season=${season}`} title={driverName(driver)} tools={<SeasonSelect value={season} onChange={setSeason} />} />
              <section className="hero" style={{ minHeight: 0, background: `radial-gradient(120% 160% at 100% 0%, color-mix(in srgb, ${color} 40%, transparent), transparent 60%), linear-gradient(160deg, var(--md-sys-color-surface-container-high), var(--md-sys-color-surface-container-low))` }}>
                <div className="profile-head">
                  <DriverPhoto driverId={driver.driverId} name={driverName(driver)} wikiUrl={driver.url} teamId={team?.constructorId} size={112} era={season} />
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="row row--wrap">
                      {profile.number.value && <span className="profile-head__num" style={{ color }}>{profile.number.value}</span>}
                      <div className="stack" style={{ gap: 2 }}>
                        <span className="m3-title-medium m3-muted">{driver.givenName}</span>
                        <span className="m3-headline-large" style={{ fontStyle: 'italic' }}>{driver.familyName.toUpperCase()}</span>
                      </div>
                      <MFavButton active={isFavorite('driver', driver.driverId)} onToggle={() => toggleFavorite({ kind: 'driver', id: driver.driverId, name: driverName(driver), season })} labelOn={t('common.removeFav')} labelOff={t('common.addFav')} />
                    </div>
                    <span className="row row--wrap m3-body-medium"><Nat nationality={driver.nationality} />{driver.nationality} · {nat.code}{team && <><TeamBar id={team.constructorId} />{team.name}</>}</span>
                  </div>
                </div>
              </section>

              <div className="grid grid-2">
                <MCard title={`${t('drivers.season')} ${season}`}>
                  <div className="stat-grid">
                    <Stat v={totalPts} l={t('common.points')} />
                    <Stat v={standing?.positionText ?? '—'} l={t('common.pos')} />
                    <Stat v={wins} l={t('common.wins')} />
                    <Stat v={podiums} l={t('common.podiums')} />
                    <Stat v={poles} l={t('common.poles')} />
                    <Stat v={dnfs} l={t('common.dnfs')} />
                  </div>
                </MCard>
                <MCard title={t('drivers.profile')}>
                  <dl className="kv">
                    <dt>{t('common.code')}</dt><dd><SrcVal s={profile.code} /></dd>
                    <dt>{t('common.number')}</dt><dd><SrcVal s={profile.number} /></dd>
                    <dt>{t('common.born')}</dt><dd><SrcVal s={profile.dateOfBirth} fmt={(v) => fmtDate(new Date(v), locale, { day: 'numeric', month: 'long', year: 'numeric' })} /></dd>
                    <dt>{t('common.nationality')}</dt><dd>{driver.nationality}</dd>
                    <dt>{t('drivers.bestFinish')}</dt><dd>{best ? `P${best}` : t('common.na')}</dd>
                  </dl>
                  {driver.url && <MButton variant="text" size="sm" href={driver.url} icon="open_in_new">{t('common.wiki')}</MButton>}
                </MCard>
              </div>

              <MCard title={t('drivers.pointsTrend')}>
                {trend.length ? <Sparkline points={trend} color={color} ariaLabel={t('drivers.pointsTrend')} /> : <MEmptyState icon="show_chart" title={t('race.notYet')} />}
              </MCard>

              <MCard title={t('drivers.raceByRace')}>
                {rows.length ? (
                  <ResponsiveTable
                    caption={t('drivers.raceByRace')}
                    rows={rows}
                    rowKey={(r) => r.race.round}
                    columns={[
                      { key: 'r', header: 'R', cell: (r) => <span className="mono">{r.race.round}</span>, width: 40 },
                      { key: 'gp', header: t('results.gp'), cell: (r) => <a href={`#/gara/${season}/${r.race.round}?tab=race`} className="driver-chip"><span className="driver-chip__name">{r.race.raceName}</span></a> },
                      { key: 'q', header: t('race.quali'), cell: (r) => r.q?.position ?? '—', num: true },
                      { key: 'g', header: t('common.grid'), cell: (r) => (r.res.grid === '0' ? 'PL' : r.res.grid ?? '—'), num: true },
                      { key: 'p', header: t('common.pos'), cell: (r) => <ResultCell res={r.res} />, num: true },
                      { key: 's', header: t('common.status'), cell: (r) => <span className="m3-body-small m3-muted">{r.res.status}</span> },
                      { key: 'pt', header: t('common.pts'), cell: (r) => <b>{Number(r.res.points) + r.sprintPts}</b>, num: true },
                    ]}
                    mobile={{
                      lead: (r) => <ResultCell res={r.res} />,
                      main: (r) => <><div className="m3-title-small ellipsis">{r.race.raceName}</div><div className="m3-body-small m3-muted">{t('common.grid')} {r.res.grid} · {r.res.status}</div></>,
                      trail: (r) => <b>{Number(r.res.points) + r.sprintPts}</b>,
                    }}
                  />
                ) : <MEmptyState icon="flag" title={t('race.notYet')} />}
              </MCard>
            </>
          )
        }}
      </Async>
      {s.status === 'loading' && <SkeletonList rows={3} />}
    </div>
  )
}

function ResultCell({ res }: { res: NonNullable<Race['Results']>[number] }) {
  const f = resultFlag(res)
  return f ? <MBadge tone={f === 'DSQ' ? 'error' : undefined}>{f}</MBadge> : <Pos p={res.positionText} />
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return <div className="stat"><span className="stat__v">{v}</span><span className="stat__l">{l}</span></div>
}
