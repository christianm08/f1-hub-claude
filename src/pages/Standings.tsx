import { Link, useSearchParams } from 'react-router-dom'
import { jolpica, driverName } from '../api/jolpica'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MCard, MTabs } from '../design'
import { Async, DriverLink, Nat, PageHead, Pos, SkeletonList, TeamBar, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { ResponsiveTable } from '../components/ResponsiveTable'
import { DriverPhoto } from '../components/DriverPhoto'
import { BarList } from '../components/charts'
import { teamColor } from '../data/meta'

type Tab = 'drivers' | 'constructors'

export default function Standings() {
  const { t, favDriverId, favTeamId } = useSettings()
  usePageTitle(t('standings.title'))
  const [season, setSeason] = useSeasonParam()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'constructors' ? 'constructors' : 'drivers'
  const ds = useApi(() => jolpica.driverStandings(season), [season])
  const cs = useApi(() => jolpica.constructorStandings(season), [season], tab === 'constructors')

  return (
    <div className="page">
      <PageHead title={t('standings.title')} sub={`${t('common.season')} ${season}`} tools={<SeasonSelect value={season} onChange={setSeason} />} />
      <MTabs
        label={t('standings.title')}
        value={tab}
        onChange={(v) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', v); return n }, { replace: true })}
        tabs={[{ id: 'drivers', label: t('standings.drivers'), icon: 'person' }, { id: 'constructors', label: t('standings.constructors'), icon: 'groups' }]}
      />
      {tab === 'drivers' ? (
        <MCard>
          <Async state={ds} skeleton={<SkeletonList rows={14} />} isEmpty={(d) => !d.length} emptyTitle={t('standings.none')}>
            {(rows) => (
              <ResponsiveTable
                caption={t('standings.drivers')}
                rows={rows}
                rowKey={(r) => r.Driver.driverId}
                highlight={(r) => r.Driver.driverId === favDriverId}
                columns={[
                  { key: 'p', header: t('common.pos'), cell: (r) => <Pos p={r.positionText} />, width: 52 },
                  { key: 'd', header: t('common.driver'), cell: (r) => <span className="row"><TeamBar id={r.Constructors.at(-1)?.constructorId} /><DriverPhoto driverId={r.Driver.driverId} name={driverName(r.Driver)} wikiUrl={r.Driver.url} teamId={r.Constructors.at(-1)?.constructorId} size={32} /><DriverLink d={r.Driver} season={season} showCode /></span> },
                  { key: 't', header: t('common.team'), cell: (r) => r.Constructors.map((c) => c.name).join(' / ') },
                  { key: 'w', header: t('common.wins'), cell: (r) => r.wins, num: true },
                  { key: 'pt', header: t('common.points'), cell: (r) => <b>{r.points}</b>, num: true },
                  { key: 'g', header: t('common.gap'), cell: (r) => <span className="mono m3-muted">{Number(rows[0].points) - Number(r.points) ? `−${Number(rows[0].points) - Number(r.points)}` : '—'}</span>, num: true },
                ]}
                mobile={{
                  lead: (r) => <Pos p={r.positionText} />,
                  main: (r) => <><div className="row"><TeamBar id={r.Constructors.at(-1)?.constructorId} /><DriverLink d={r.Driver} season={season} /></div><div className="m3-body-small m3-muted">{r.Constructors.at(-1)?.name}</div></>,
                  trail: (r) => <><b>{r.points}</b><div className="m3-body-small m3-muted">{r.wins} {t('common.wins').toLowerCase()}</div></>,
                }}
              />
            )}
          </Async>
        </MCard>
      ) : (
        <Async state={cs} skeleton={<SkeletonList rows={10} />} isEmpty={(d) => !d.length} emptyTitle={t('standings.none')}>
          {(rows) => (
            <div className="grid grid-2">
              <MCard>
                <ResponsiveTable
                  caption={t('standings.constructors')}
                  rows={rows}
                  rowKey={(r) => r.Constructor.constructorId}
                  highlight={(r) => r.Constructor.constructorId === favTeamId}
                  columns={[
                    { key: 'p', header: t('common.pos'), cell: (r) => <Pos p={r.positionText} />, width: 52 },
                    { key: 't', header: t('common.team'), cell: (r) => <Link to={`/team/${r.Constructor.constructorId}?season=${season}`} className="driver-chip"><TeamBar id={r.Constructor.constructorId} /><Nat nationality={r.Constructor.nationality} /><span className="driver-chip__name">{r.Constructor.name}</span></Link> },
                    { key: 'w', header: t('common.wins'), cell: (r) => r.wins, num: true },
                    { key: 'pt', header: t('common.points'), cell: (r) => <b>{r.points}</b>, num: true },
                  ]}
                  mobile={{
                    lead: (r) => <Pos p={r.positionText} />,
                    main: (r) => <Link to={`/team/${r.Constructor.constructorId}?season=${season}`} className="driver-chip"><TeamBar id={r.Constructor.constructorId} /><span className="driver-chip__name">{r.Constructor.name}</span></Link>,
                    trail: (r) => <b>{r.points}</b>,
                  }}
                />
              </MCard>
              <MCard title={t('common.points')}>
                <BarList rows={rows.map((r) => ({ label: r.Constructor.name, value: Number(r.points), color: teamColor(r.Constructor.constructorId) }))} />
              </MCard>
            </div>
          )}
        </Async>
      )}
    </div>
  )
}
