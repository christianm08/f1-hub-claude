import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jolpica, driverName } from '../api/jolpica'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MCard, MFavButton, MSkeleton } from '../design'
import { Async, PageHead, SkeletonCards, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { TrackMap } from '../components/TrackMap'
import { FlagIcon } from '../components/FlagIcon'
import { circuitInfo, fmtLength } from '../data/circuits'
import type { Circuit } from '../api/jolpica'

export default function Circuits() {
  const { t } = useSettings()
  usePageTitle(t('circuits.title'))
  const [season, setSeason] = useSeasonParam()
  const [params] = useSearchParams()
  const focus = params.get('c')
  const s = useApi(() => jolpica.circuits(season), [season])

  return (
    <div className="page">
      <PageHead title={t('circuits.title')} sub={`${t('common.season')} ${season}`} tools={<SeasonSelect value={season} onChange={setSeason} />} />
      <Async state={s} skeleton={<SkeletonCards n={9} h={360} />} isEmpty={(d) => !d.length}>
        {(list) => (
          <div className="grid grid-cards">
            {list.map((c) => <CircuitCard key={c.circuitId} c={c} season={season} focus={focus === c.circuitId} />)}
          </div>
        )}
      </Async>
    </div>
  )
}

function CircuitCard({ c, season, focus }: { c: Circuit; season: number; focus: boolean }) {
  const { t, locale, units, isFavorite, toggleFavorite } = useSettings()
  const info = circuitInfo(c)
  const ref = useRef<HTMLDivElement>(null)
  const winners = useApi(() => jolpica.circuitWinners(c.circuitId), [c.circuitId])
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focus])
  const last = winners.data?.at(-1)
  return (
    <div ref={ref} id={`c-${c.circuitId}`}>
      <MCard variant={focus ? 'outlined' : 'low'} style={focus ? { boxShadow: 'inset 0 0 0 2px var(--md-sys-color-primary)' } : undefined}>
        <div className="stack">
          <div className="row">
            <FlagIcon iso2={info.iso2} code={info.code} title={c.Location.country} />
            <h2 className="m3-title-large grow ellipsis" style={{ margin: 0 }}>{c.circuitName}</h2>
            <MFavButton active={isFavorite('circuit', c.circuitId)} onToggle={() => toggleFavorite({ kind: 'circuit', id: c.circuitId, name: c.circuitName, season })} labelOn={t('common.removeFav')} labelOff={t('common.addFav')} />
          </div>
          <div style={{ padding: '4px 24px' }}><TrackMap circuitId={c.circuitId} stroke={12} /></div>
          <dl className="kv">
            <dt>{t('circuits.locality')}</dt><dd>{c.Location.locality}</dd>
            <dt>{t('circuits.country')}</dt><dd>{c.Location.country}</dd>
            <dt>{t('circuits.coords')}</dt><dd className="mono">{Number(c.Location.lat).toFixed(3)}, {Number(c.Location.long).toFixed(3)}</dd>
            <dt>{t('circuits.length')}</dt><dd>{fmtLength(info.lengthM, units, locale) ?? t('common.na')}</dd>
            <dt>{t('circuits.turns')}</dt><dd>{t('common.na')}</dd>
            <dt>{t('circuits.lapRecord')}</dt><dd>{t('common.na')}</dd>
            <dt>{t('common.winner')}</dt>
            <dd>
              {winners.data === undefined ? <MSkeleton w={120} h={14} style={{ marginLeft: 'auto' }} /> : last ? `${driverName(last.Results?.[0]?.Driver)} (${last.season})` : t('common.na')}
            </dd>
          </dl>
          {winners.data && winners.data.length > 1 && (
            <p className="note">{t('circuits.recentWinners')}: {[...winners.data].reverse().slice(1).map((w) => `${w.Results?.[0]?.Driver.familyName} ${w.season}`).join(' · ')}</p>
          )}
          {info.hasTrack && <p className="note">{t('circuits.trackSource')}</p>}
        </div>
      </MCard>
    </div>
  )
}
