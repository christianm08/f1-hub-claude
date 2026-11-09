// Mappa posizioni (lazy). `location` OpenF1: campionata ~3,7 s, unità NON metri e origine arbitraria:
// il fit è puramente relativo al bounding box. Scarica solo una finestra di pochi secondi attorno all'istante.

import { useMemo } from 'react'
import { openf1, type OF1Location } from '../../api/openf1'
import type { RCData } from '../../api/openf1live'
import { fitToBox, latestBy, teamHex } from '../../api/openf1model'
import { useApi } from '../../hooks/useApi'
import { useSettings } from '../../store/settings'
import { MCard, MEmptyState, MLinearProgress } from '../../design'

const WINDOW_MS = 8_000

export default function CircuitMapPanel({ data, at, selected }: { data: RCData; at: string | null; selected: number | null }) {
  const { t } = useSettings()
  const s = data.session!
  // istante di riferimento: replay → `at`, altrimenti fine sessione; arrotondato a 4 s per riusare la cache
  const ref = useMemo(() => {
    const ms = at ? new Date(at).getTime() : Math.min(Date.now(), new Date(s.date_end).getTime())
    return Math.floor(ms / 4000) * 4000
  }, [at, s.date_end])

  // traccia: un giro di un pilota (una sola richiesta, in cache a lungo)
  const outline = useApi(async (signal) => {
    const ref0 = data.laps.find((l) => l.lap_number === 5 && l.date_start && l.lap_duration) ?? data.laps.find((l) => l.date_start && l.lap_duration)
    if (!ref0?.date_start || !ref0.lap_duration) return [] as OF1Location[]
    const start = new Date(ref0.date_start)
    const end = new Date(start.getTime() + ref0.lap_duration * 1000)
    return openf1.location({ session_key: s.session_key, driver_number: ref0.driver_number, 'date>': start.toISOString(), 'date<': end.toISOString() }, { signal, ttl: 7 * 86_400_000 })
  }, [s.session_key, data.laps.length > 0])

  const pos = useApi(async (signal) => {
    const from = new Date(ref - WINDOW_MS).toISOString()
    const to = new Date(ref).toISOString()
    return openf1.location({ session_key: s.session_key, 'date>': from, 'date<': to }, { signal, ttl: 60_000 })
  }, [s.session_key, ref])

  const pts = outline.data ?? []
  const all = [...pts, ...(pos.data ?? [])].filter((p) => p.x !== 0 || p.y !== 0)
  const fit = fitToBox(all)
  const cars = [...latestBy((pos.data ?? []).filter((p) => p.x !== 0 || p.y !== 0)).values()]
  const drivers = new Map(data.drivers.map((d) => [d.driver_number, d]))
  const path = pts.filter((p) => p.x !== 0 || p.y !== 0).map((p, i) => `${i ? 'L' : 'M'}${fit.tx(p.x).toFixed(1)} ${fit.ty(p.y).toFixed(1)}`).join(' ')

  return (
    <MCard title={t('live.tab.map')} className="glass-map">
      {(outline.status === 'loading' || pos.status === 'loading') && <MLinearProgress label={t('common.loading')} />}
      {!all.length && outline.status !== 'loading' && pos.status !== 'loading' ? (
        <MEmptyState icon="map" title={t('live.mapUnavailable')} />
      ) : (
        <svg className="map-svg" viewBox={`0 0 ${fit.w} ${fit.h}`} role="img" aria-label={t('live.tab.map')}>
          {path && <path d={path} fill="none" stroke="var(--md-sys-color-outline-variant)" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round" />}
          {path && <path d={path} fill="none" stroke="var(--md-sys-color-on-surface-variant)" strokeWidth="4" strokeLinejoin="round" opacity=".6" />}
          {cars.map((c) => {
            const d = drivers.get(c.driver_number)
            const sel = selected === c.driver_number
            return (
              <g key={c.driver_number} className="map-dot" transform={`translate(${fit.tx(c.x)} ${fit.ty(c.y)})`}>
                <circle r={sel ? 20 : 14} fill={teamHex(d)} stroke="var(--md-sys-color-surface)" strokeWidth="4" />
                <text y={-24} textAnchor="middle">{d?.name_acronym ?? c.driver_number}</text>
              </g>
            )
          })}
        </svg>
      )}
      <p className="note">{t('live.mapNote')}</p>
    </MCard>
  )
}
