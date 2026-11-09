import { Link } from 'react-router-dom'
import { jolpica, nextSession, raceSessions, raceStatus, type Race } from '../api/jolpica'
import { fetchNews } from '../api/news'
import { useApi } from '../hooks/useApi'
import { useSettings } from '../store/settings'
import { CountdownCells, MBadge, MButton, MCard, MEmptyState, MIcon, MList, MListItem, MSkeleton } from '../design'
import { Async, DriverLink, Pos, SkeletonList, TeamBar, fmtDate, fmtDateTime, usePageTitle } from '../components/ui'
import { TrackMap } from '../components/TrackMap'
import { FlagIcon } from '../components/FlagIcon'
import { countryInfo, teamColor } from '../data/meta'
import { DriverPhoto } from '../components/DriverPhoto'

export default function Home() {
  const { t, season, locale } = useSettings()
  usePageTitle('')
  const schedule = useApi(() => jolpica.schedule(season), [season])
  const ds = useApi(() => jolpica.driverStandings(season), [season])
  const cs = useApi(() => jolpica.constructorStandings(season), [season])
  const news = useApi((s) => fetchNews(s), [])

  const next = schedule.data ? nextSession(schedule.data) : null
  const lastPast = schedule.data ? [...schedule.data].reverse().find((r) => raceStatus(r) === 'past') : undefined
  const last = useApi(async () => (lastPast ? jolpica.raceResults(lastPast.season, lastPast.round) : undefined), [lastPast?.season, lastPast?.round], !!lastPast)

  return (
    <div className="page">
      <h1 className="sr-only">F1 Hub</h1>
      {schedule.status === 'error' && !schedule.data ? (
        <MCard><Async state={schedule}>{() => null}</Async></MCard>
      ) : !schedule.data ? (
        <MSkeleton h={300} r="32px 32px 32px 10px" />
      ) : next ? (
        <Hero race={next.race} live={next.live || raceStatus(next.race) === 'live'} sessionKind={next.session.kind} start={next.session.start} />
      ) : (
        <section className="hero"><div className="hero__eyebrow"><MBadge>{season}</MBadge></div><h2 className="hero__title">{t('home.seasonOver')}</h2></section>
      )}

      <div className="grid grid-3">
        <MCard title={t('home.topDrivers')} action={<MButton variant="text" size="sm" to="/classifiche">{t('common.seeAll')}</MButton>}>
          <Async state={ds} skeleton={<SkeletonList rows={5} />} isEmpty={(d) => !d.length} emptyTitle={t('standings.none')}>
            {(rows) => (
              <MList>
                {rows.slice(0, 5).map((r) => (
                  <MListItem
                    key={r.Driver.driverId}
                    to={`/piloti/${r.Driver.driverId}?season=${season}`}
                    lead={<><Pos p={r.positionText} /><DriverPhoto driverId={r.Driver.driverId} name={`${r.Driver.givenName} ${r.Driver.familyName}`} wikiUrl={r.Driver.url} teamId={r.Constructors.at(-1)?.constructorId} size={36} /></>}
                    headline={<>{r.Driver.givenName} <b>{r.Driver.familyName}</b></>}
                    support={r.Constructors.map((c) => c.name).join(' / ')}
                    trail={<b className="tabular">{r.points} {t('common.pts')}</b>}
                  />
                ))}
              </MList>
            )}
          </Async>
        </MCard>

        <MCard title={t('home.topTeams')} action={<MButton variant="text" size="sm" to="/classifiche?tab=constructors">{t('common.seeAll')}</MButton>}>
          <Async state={cs} skeleton={<SkeletonList rows={5} />} isEmpty={(d) => !d.length} emptyTitle={t('standings.none')}>
            {(rows) => (
              <MList>
                {rows.slice(0, 5).map((r) => (
                  <MListItem
                    key={r.Constructor.constructorId}
                    to={`/team/${r.Constructor.constructorId}?season=${season}`}
                    lead={<><Pos p={r.positionText} /><TeamBar id={r.Constructor.constructorId} /></>}
                    headline={r.Constructor.name}
                    support={`${r.wins} ${t('common.wins').toLowerCase()}`}
                    trail={<b className="tabular">{r.points} {t('common.pts')}</b>}
                  />
                ))}
              </MList>
            )}
          </Async>
        </MCard>

        <MCard title={t('home.lastGp')}>
          {!schedule.data ? <SkeletonList rows={4} /> : !lastPast ? (
            <MEmptyState icon="flag" title={t('race.notYet')} />
          ) : (
            <Async state={last} skeleton={<SkeletonList rows={4} />} isEmpty={(r) => !r?.Results?.length} emptyTitle={t('race.notYet')}>
              {(race) => (
                <div className="stack">
                  <Link to={`/gara/${race!.season}/${race!.round}`} className="row" style={{ textDecoration: 'none' }}>
                    <FlagIcon {...countryInfo(race!.Circuit.Location.country)} title={race!.Circuit.Location.country} />
                    <span className="m3-title-medium grow ellipsis">{race!.raceName}</span>
                    <span className="m3-body-small m3-muted">{fmtDate(new Date(race!.date), locale)}</span>
                  </Link>
                  <MList>
                    {race!.Results!.slice(0, 3).map((r) => (
                      <MListItem
                        key={r.Driver.driverId}
                        lead={<><Pos p={r.positionText} /><TeamBar id={r.Constructor.constructorId} /></>}
                        headline={<DriverLink d={r.Driver} season={Number(race!.season)} />}
                        support={r.Constructor.name}
                        trail={<span className="mono m3-body-small">{r.Time?.time ?? r.status}</span>}
                      />
                    ))}
                  </MList>
                  <MButton variant="tonal" size="sm" to={`/gara/${race!.season}/${race!.round}`} icon="table_rows">{t('home.raceResult')}</MButton>
                </div>
              )}
            </Async>
          )}
        </MCard>
      </div>

      <Favorites />

      <div className="section-title">
        <h2 className="m3-title-large">{t('home.latestNews')}</h2>
        <MButton variant="text" size="sm" to="/news">{t('common.seeAll')}</MButton>
      </div>
      <Async state={news} skeleton={<div className="grid grid-cards">{[0, 1, 2, 3].map((i) => <MSkeleton key={i} h={140} r="24px 24px 24px 8px" />)}</div>} isEmpty={(d) => !d.items.length} emptyTitle={t('news.feedDown')}>
        {(d) => (
          <div className="grid grid-cards">
            {d.items.slice(0, 4).map((n) => (
              <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="m3-card m3-card--link m3-state news-card">
                <span className="row m3-label-medium m3-muted"><MIcon name="newspaper" size={16} />{n.source} · {fmtDate(n.date, locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <h3 className="m3-title-medium">{n.title}</h3>
                <p className="m3-body-small">{n.excerpt}</p>
              </a>
            ))}
          </div>
        )}
      </Async>
    </div>
  )
}

function Hero({ race, live, sessionKind, start }: { race: Race; live: boolean; sessionKind: string; start: Date }) {
  const { t, locale } = useSettings()
  const ci = countryInfo(race.Circuit.Location.country)
  const sessions = raceSessions(race)
  return (
    <section className={`hero${live ? ' hero--live' : ''}`} aria-label={live ? t('home.liveNow') : t('home.nextGp')}>
      <div className="hero__eyebrow">
        {live ? <MBadge tone="live">{t('live.statusLive')}</MBadge> : <MBadge tone="primary">{t('home.nextGp')}</MBadge>}
        <MBadge>{t('common.round')} {race.round}</MBadge>
        {race.Sprint && <MBadge tone="tertiary">{t('cal.sprintWeekend')}</MBadge>}
      </div>
      <div className="hero__body">
        <div className="stack" style={{ gap: 16 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="hero__title">{race.raceName}</h2>
            <span className="row m3-body-large m3-muted"><FlagIcon iso2={ci.iso2} code={ci.code} title={race.Circuit.Location.country} />{race.Circuit.circuitName} · {race.Circuit.Location.locality}</span>
          </div>
          {live ? (
            <div className="row row--wrap">
              <MButton variant="brand" icon="sensors" to="/live">{t('home.openRaceCenter')}</MButton>
              <MButton variant="outlined" to={`/gara/${race.season}/${race.round}`}>{t('race.info')}</MButton>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              <span className="m3-label-large m3-muted">{t('home.countdownTo')} {t(`session.${sessionKind}` as 'session.race')} · {fmtDateTime(start, locale)}</span>
              <CountdownCells target={start} labels={[t('cd.days'), t('cd.hours'), t('cd.min'), t('cd.sec')]} />
            </div>
          )}
          <div className="row row--wrap" style={{ gap: 6 }}>
            {sessions.map((s) => (
              <span key={s.kind} className="m3-chip m3-chip--static" style={{ height: 28 }}>
                <b>{t(`session.${s.kind}` as 'session.race')}</b>&nbsp;<span className="m3-muted">{fmtDateTime(s.start, locale)}</span>
              </span>
            ))}
          </div>
          {!live && <MButton variant="tonal" size="sm" to={`/gara/${race.season}/${race.round}`} icon="arrow_forward">{t('race.info')}</MButton>}
        </div>
        <div className="hero__track"><TrackMap circuitId={race.Circuit.circuitId} stroke={12} /></div>
      </div>
    </section>
  )
}

function Favorites() {
  const { t, favorites } = useSettings()
  return (
    <MCard title={t('home.favorites')}>
      {!favorites.length ? (
        <p className="m3-body-medium m3-muted" style={{ margin: 0 }}>{t('home.noFavorites')}</p>
      ) : (
        <div className="row row--wrap">
          {favorites.map((f) => {
            const to = f.kind === 'driver' ? `/piloti/${f.id}?season=${f.season}` : f.kind === 'team' ? `/team/${f.id}?season=${f.season}` : `/circuiti?c=${f.id}`
            return (
              <Link key={`${f.kind}:${f.id}`} to={to} className="m3-chip m3-state" style={{ textDecoration: 'none', height: 40 }}>
                <MIcon name={f.kind === 'driver' ? 'person' : f.kind === 'team' ? 'groups' : 'route'} size={18} style={{ color: f.kind === 'team' ? teamColor(f.id) : undefined }} />
                {f.name}
                {f.kind !== 'circuit' && <span className="m3-muted">{f.season}</span>}
              </Link>
            )
          })}
        </div>
      )}
    </MCard>
  )
}

