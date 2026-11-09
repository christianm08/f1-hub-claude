import { Link, useParams } from 'react-router-dom'
import { jolpica, driverName, resultFlag, type Driver } from '../api/jolpica'
import { teamProfile } from '../api/model'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MButton, MCard, MEmptyState, MFavButton } from '../design'
import { Async, Nat, PageHead, PageSkeleton, Pos, SrcVal, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { TeamLogo } from '../components/TeamLogo'
import { CarImage } from '../components/CarImage'
import { DriverPhoto } from '../components/DriverPhoto'
import { BarList } from '../components/charts'
import { ResponsiveTable } from '../components/ResponsiveTable'
import { teamColor } from '../data/meta'

export default function TeamDetail() {
  const { constructorId = '' } = useParams()
  const [season, setSeason] = useSeasonParam()
  const { t, isFavorite, toggleFavorite } = useSettings()

  const s = useApi(async () => {
    const [results, sprint, standings] = await Promise.all([
      jolpica.constructorResults(season, constructorId),
      jolpica.constructorSprint(season, constructorId).catch(() => []),
      jolpica.constructorStandings(season).catch(() => []),
    ])
    const team = results[0]?.Results?.[0]?.Constructor ?? standings.find((x) => x.Constructor.constructorId === constructorId)?.Constructor ?? (await jolpica.constructorInfo(constructorId))
    if (!team) return null
    const profile = await teamProfile(team, season)
    return { team, profile, results, sprint, standing: standings.find((x) => x.Constructor.constructorId === constructorId) }
  }, [season, constructorId])
  usePageTitle(s.data?.team.name ?? t('teams.title'))

  if (!s.data && s.status === 'loading') return <PageSkeleton />

  return (
    <div className="page">
      <Async state={s} skeleton={<PageSkeleton />} isEmpty={(d) => !d} emptyTitle={t('teams.notFound')}>
        {(d) => {
          const { team, profile, results, sprint, standing } = d!
          const color = teamColor(team.constructorId)
          const drivers = new Map<string, Driver>()
          results.forEach((r) => r.Results?.forEach((x) => drivers.set(x.Driver.driverId, x.Driver)))
          const perGp = results.map((r) => {
            const sp = sprint.find((x) => x.round === r.round)?.SprintResults ?? []
            return { race: r, pts: (r.Results ?? []).reduce((a, x) => a + Number(x.points), 0) + sp.reduce((a, x) => a + Number(x.points), 0) }
          })
          const all = results.flatMap((r) => r.Results ?? [])
          const wins = all.filter((x) => x.position === '1').length
          const podiums = all.filter((x) => Number(x.position) <= 3 && /^\d+$/.test(x.positionText)).length
          const dnfs = all.filter((x) => resultFlag(x) === 'DNF').length
          const total = standing ? Number(standing.points) : perGp.reduce((a, x) => a + x.pts, 0)
          return (
            <>
              <PageHead back={`/team?season=${season}`} title={team.name} tools={<SeasonSelect value={season} onChange={setSeason} />} />
              <section className="hero" style={{ minHeight: 0, background: `radial-gradient(120% 160% at 100% 0%, color-mix(in srgb, ${color} 45%, transparent), transparent 60%), linear-gradient(160deg, var(--md-sys-color-surface-container-high), var(--md-sys-color-surface-container-low))` }}>
                <div className="hero__body">
                  <div className="row" style={{ gap: 16 }}>
                    <TeamLogo constructorId={team.constructorId} name={team.name} wikiUrl={team.url} size={84} />
                    <div className="stack" style={{ gap: 6 }}>
                      <span className="m3-headline-large" style={{ fontStyle: 'italic' }}>{team.name}</span>
                      <span className="row m3-body-medium"><Nat nationality={team.nationality} />{team.nationality}</span>
                    </div>
                    <MFavButton active={isFavorite('team', team.constructorId)} onToggle={() => toggleFavorite({ kind: 'team', id: team.constructorId, name: team.name, season })} labelOn={t('common.removeFav')} labelOff={t('common.addFav')} />
                  </div>
                  <div style={{ width: 'min(100%, 360px)' }}><CarImage constructorId={team.constructorId} season={season} name={team.name} /></div>
                </div>
              </section>

              <div className="grid grid-2">
                <MCard title={`${t('drivers.season')} ${season}`}>
                  <div className="stat-grid">
                    <div className="stat"><span className="stat__v">{total}</span><span className="stat__l">{t('common.points')}</span></div>
                    <div className="stat"><span className="stat__v">{standing?.positionText ?? '—'}</span><span className="stat__l">{t('common.pos')}</span></div>
                    <div className="stat"><span className="stat__v">{wins}</span><span className="stat__l">{t('common.wins')}</span></div>
                    <div className="stat"><span className="stat__v">{podiums}</span><span className="stat__l">{t('common.podiums')}</span></div>
                    <div className="stat"><span className="stat__v">{dnfs}</span><span className="stat__l">{t('common.dnfs')}</span></div>
                  </div>
                </MCard>
                <MCard title={t('drivers.profile')}>
                  <dl className="kv">
                    <dt>{t('common.nationality')}</dt><dd>{team.nationality}</dd>
                    <dt>{t('teams.base')}</dt><dd><SrcVal s={profile.base} /></dd>
                    <dt>{t('teams.firstSeason')}</dt><dd><SrcVal s={profile.firstSeason} /></dd>
                    <dt>{t('teams.ctitles')}</dt><dd><SrcVal s={profile.constructorsTitles} /></dd>
                    <dt>{t('teams.dtitles')}</dt><dd><SrcVal s={profile.driversTitles} /></dd>
                  </dl>
                  {team.url && <MButton variant="text" size="sm" href={team.url} icon="open_in_new">{t('common.wiki')}</MButton>}
                </MCard>
              </div>

              <MCard title={t('teams.drivers')}>
                {drivers.size ? (
                  <div className="grid grid-cards-sm">
                    {[...drivers.values()].map((dr) => {
                      const pts = all.filter((x) => x.Driver.driverId === dr.driverId).reduce((a, x) => a + Number(x.points), 0) + sprint.flatMap((r) => r.SprintResults ?? []).filter((x) => x.Driver.driverId === dr.driverId).reduce((a, x) => a + Number(x.points), 0)
                      return (
                        <Link key={dr.driverId} to={`/piloti/${dr.driverId}?season=${season}`} className="m3-card m3-card--filled m3-card--link m3-state row" style={{ gap: 12 }}>
                          <DriverPhoto driverId={dr.driverId} name={driverName(dr)} wikiUrl={dr.url} teamId={team.constructorId} size={52} />
                          <div className="grow stack" style={{ gap: 0 }}>
                            <span className="m3-title-medium ellipsis">{driverName(dr)}</span>
                            <span className="row m3-body-small m3-muted"><Nat nationality={dr.nationality} />{dr.code}{dr.permanentNumber ? ` · #${dr.permanentNumber}` : ''}</span>
                          </div>
                          <b className="tabular">{pts}</b>
                        </Link>
                      )
                    })}
                  </div>
                ) : <MEmptyState icon="person" title={t('race.notYet')} />}
              </MCard>

              <MCard title={t('teams.pointsPerGp')}>
                {perGp.length ? <BarList rows={perGp.map((x) => ({ label: x.race.raceName.replace(' Grand Prix', ''), value: x.pts }))} color={color} /> : <MEmptyState icon="bar_chart" title={t('race.notYet')} />}
              </MCard>

              <MCard title={t('drivers.raceByRace')}>
                {results.length ? (
                  <ResponsiveTable
                    caption={t('drivers.raceByRace')}
                    rows={perGp}
                    rowKey={(r) => r.race.round}
                    columns={[
                      { key: 'r', header: 'R', cell: (r) => <span className="mono">{r.race.round}</span>, width: 40 },
                      { key: 'gp', header: t('results.gp'), cell: (r) => <Link to={`/gara/${season}/${r.race.round}?tab=race`} className="driver-chip"><span className="driver-chip__name">{r.race.raceName}</span></Link> },
                      ...[...drivers.values()].slice(0, 3).map((dr) => ({
                        key: dr.driverId,
                        header: dr.code ?? dr.familyName,
                        cell: (r: (typeof perGp)[number]) => {
                          const x = r.race.Results?.find((y) => y.Driver.driverId === dr.driverId)
                          if (!x) return '—'
                          const f = resultFlag(x)
                          return f ? <span className="m3-body-small">{f}</span> : <Pos p={x.positionText} />
                        },
                        num: true,
                      })),
                      { key: 'pt', header: t('common.pts'), cell: (r) => <b>{r.pts}</b>, num: true },
                    ]}
                    mobile={{
                      lead: (r) => <span className="mono">{r.race.round}</span>,
                      main: (r) => <><div className="m3-title-small ellipsis">{r.race.raceName}</div><div className="m3-body-small m3-muted">{(r.race.Results ?? []).map((x) => `${x.Driver.code ?? x.Driver.familyName} ${resultFlag(x) ?? 'P' + x.positionText}`).join(' · ')}</div></>,
                      trail: (r) => <b>{r.pts}</b>,
                    }}
                  />
                ) : <MEmptyState icon="flag" title={t('race.notYet')} />}
              </MCard>
            </>
          )
        }}
      </Async>
    </div>
  )
}
