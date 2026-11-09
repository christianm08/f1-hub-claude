import { jolpica, driverName } from '../api/jolpica'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MCard, MFavButton } from '../design'
import { Async, Nat, PageHead, Pos, SkeletonCards, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { TeamLogo } from '../components/TeamLogo'
import { teamColor } from '../data/meta'

export default function Teams() {
  const { t, isFavorite, toggleFavorite } = useSettings()
  usePageTitle(t('teams.title'))
  const [season, setSeason] = useSeasonParam()

  const s = useApi(async () => {
    const [standings, teams, ds] = await Promise.all([
      jolpica.constructorStandings(season).catch(() => []),
      jolpica.constructors(season),
      jolpica.driverStandings(season).catch(() => []),
    ])
    const byTeam = new Map<string, string[]>()
    ds.forEach((d) => {
      const id = d.Constructors.at(-1)?.constructorId
      if (id) byTeam.set(id, [...(byTeam.get(id) ?? []), driverName(d.Driver)])
    })
    const ranked = standings.map((st) => ({ team: st.Constructor, pos: st.positionText, points: st.points, wins: st.wins }))
    const seen = new Set(ranked.map((r) => r.team.constructorId))
    const others = teams.filter((c) => !seen.has(c.constructorId)).map((c) => ({ team: c, pos: '—', points: '', wins: '' }))
    return [...ranked, ...others].map((r) => ({ ...r, drivers: byTeam.get(r.team.constructorId) ?? [] }))
  }, [season])

  return (
    <div className="page">
      <PageHead title={t('teams.title')} sub={`${t('common.season')} ${season}`} tools={<SeasonSelect value={season} onChange={setSeason} />} />
      <Async state={s} skeleton={<SkeletonCards n={10} h={140} />} isEmpty={(d) => !d.length}>
        {(rows) => (
          <div className="grid grid-cards">
            {rows.map((r) => (
              <MCard key={r.team.constructorId} to={`/team/${r.team.constructorId}?season=${season}`} aria-label={r.team.name} style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${teamColor(r.team.constructorId)} 16%, var(--md-sys-color-surface-container-low)), var(--md-sys-color-surface-container-low) 60%)` }}>
                <div className="row" style={{ gap: 14 }}>
                  <Pos p={r.pos} />
                  <TeamLogo constructorId={r.team.constructorId} name={r.team.name} wikiUrl={r.team.url} size={52} />
                  <div className="grow stack" style={{ gap: 2 }}>
                    <span className="m3-title-large ellipsis">{r.team.name}</span>
                    <span className="row m3-body-small m3-muted"><Nat nationality={r.team.nationality} />{r.team.nationality}</span>
                  </div>
                  <MFavButton active={isFavorite('team', r.team.constructorId)} onToggle={() => toggleFavorite({ kind: 'team', id: r.team.constructorId, name: r.team.name, season })} labelOn={t('common.removeFav')} labelOff={t('common.addFav')} />
                </div>
                <div className="row row--between" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <span className="m3-body-small m3-muted ellipsis grow">{r.drivers.join(' · ') || ' '}</span>
                  {r.points !== '' && <b className="tabular">{r.points} <span className="m3-body-small m3-muted">{t('common.pts')}</span></b>}
                </div>
              </MCard>
            ))}
          </div>
        )}
      </Async>
    </div>
  )
}
