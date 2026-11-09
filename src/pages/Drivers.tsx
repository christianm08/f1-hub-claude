import { jolpica, driverName } from '../api/jolpica'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MCard, MFavButton } from '../design'
import { Async, Nat, PageHead, Pos, SkeletonCards, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { DriverPhoto } from '../components/DriverPhoto'
import { teamColor } from '../data/meta'

export default function Drivers() {
  const { t, isFavorite, toggleFavorite } = useSettings()
  usePageTitle(t('drivers.title'))
  const [season, setSeason] = useSeasonParam()

  // Lista ordinata per classifica; i piloti senza punti/classifica (es. inizio stagione) seguono in ordine alfabetico.
  const s = useApi(async () => {
    const [standings, drivers] = await Promise.all([jolpica.driverStandings(season).catch(() => []), jolpica.drivers(season)])
    const ranked = standings.map((st) => ({ driver: st.Driver, team: st.Constructors.at(-1), pos: st.positionText, points: st.points }))
    const seen = new Set(ranked.map((r) => r.driver.driverId))
    const others = drivers.filter((d) => !seen.has(d.driverId)).sort((a, b) => a.familyName.localeCompare(b.familyName)).map((d) => ({ driver: d, team: undefined, pos: '—', points: '' }))
    return [...ranked, ...others]
  }, [season])

  return (
    <div className="page">
      <PageHead title={t('drivers.title')} sub={`${t('common.season')} ${season}`} tools={<SeasonSelect value={season} onChange={setSeason} />} />
      <Async state={s} skeleton={<SkeletonCards n={12} h={110} />} isEmpty={(d) => !d.length}>
        {(rows) => (
          <div className="grid grid-cards">
            {rows.map((r) => (
              <MCard key={r.driver.driverId} to={`/piloti/${r.driver.driverId}?season=${season}`} aria-label={driverName(r.driver)} style={{ borderLeft: `4px solid ${teamColor(r.team?.constructorId)}` }}>
                <div className="row" style={{ gap: 14 }}>
                  <Pos p={r.pos} />
                  <DriverPhoto driverId={r.driver.driverId} name={driverName(r.driver)} wikiUrl={r.driver.url} teamId={r.team?.constructorId} size={56} />
                  <div className="grow stack" style={{ gap: 2 }}>
                    <span className="m3-body-medium m3-muted">{r.driver.givenName}</span>
                    <span className="m3-title-large ellipsis">{r.driver.familyName}</span>
                    <span className="row m3-body-small m3-muted"><Nat nationality={r.driver.nationality} />{r.team?.name ?? ''}{r.driver.permanentNumber ? ` · #${r.driver.permanentNumber}` : ''}</span>
                  </div>
                  <div className="stack" style={{ justifyItems: 'end', gap: 0 }}>
                    <MFavButton
                      active={isFavorite('driver', r.driver.driverId)}
                      onToggle={() => toggleFavorite({ kind: 'driver', id: r.driver.driverId, name: driverName(r.driver), season })}
                      labelOn={t('common.removeFav')}
                      labelOff={t('common.addFav')}
                    />
                    {r.points !== '' && <b className="tabular">{r.points} <span className="m3-body-small m3-muted">{t('common.pts')}</span></b>}
                  </div>
                </div>
              </MCard>
            ))}
          </div>
        )}
      </Async>
    </div>
  )
}
