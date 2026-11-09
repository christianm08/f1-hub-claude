// Telemetria car_data (lazy). ~3,2 Hz, DRS aperto se ≥ 10. Solo live + breve buffer:
// sulle sessioni storiche OpenF1 restituisce [] → stato onesto telemetryAvailable = false.

import { useMemo } from 'react'
import { openf1 } from '../../api/openf1'
import type { RCData } from '../../api/openf1live'
import { teamHex } from '../../api/openf1model'
import { useApi } from '../../hooks/useApi'
import { useSettings } from '../../store/settings'
import { MCard, MEmptyState, MLinearProgress } from '../../design'

export default function TelemetryPanel({ data, at, driver }: { data: RCData; at: string | null; driver: number | null }) {
  const { t, units } = useSettings()
  const s = data.session!
  const ref = useMemo(() => Math.floor((at ? new Date(at).getTime() : Math.min(Date.now(), new Date(s.date_end).getTime())) / 5000) * 5000, [at, s.date_end])
  const q = useApi(
    (signal) => openf1.carData({ session_key: s.session_key, driver_number: driver!, 'date>': new Date(ref - 30_000).toISOString(), 'date<': new Date(ref).toISOString() }, { signal, ttl: 30_000 }),
    [s.session_key, driver, ref],
    driver != null,
  )
  const d = data.drivers.find((x) => x.driver_number === driver)
  if (driver == null) return <MCard title={t('live.tab.telemetry')}><MEmptyState icon="person" title={t('live.selectDriver')} /></MCard>
  const rows = q.data ?? []
  const telemetryAvailable = rows.length > 0
  const last = rows[rows.length - 1]
  const spd = (v: number) => (units === 'metric' ? `${v} ${t('units.kmh')}` : `${Math.round(v * 0.621371)} ${t('units.mph')}`)

  return (
    <MCard title={`${t('live.tab.telemetry')} · ${d?.name_acronym ?? driver}`}>
      {q.status === 'loading' && <MLinearProgress label={t('common.loading')} />}
      {q.status !== 'loading' && !telemetryAvailable ? (
        <MEmptyState icon="speed" title={t('live.telemetryUnavailable')} text={t('live.telemetryHint')} />
      ) : last ? (
        <div className="stack">
          <div className="weather-grid">
            <div className="stat"><span className="stat__l">{t('live.speed')}</span><span className="stat__v">{spd(last.speed)}</span></div>
            <div className="stat"><span className="stat__l">{t('live.gear')}</span><span className="stat__v">{last.n_gear}</span></div>
            <div className="stat"><span className="stat__l">{t('live.rpm')}</span><span className="stat__v">{last.rpm}</span></div>
            <div className="stat"><span className="stat__l">{t('live.drs')}</span><span className="stat__v" style={{ fontSize: 18 }}>{last.drs >= 10 ? t('live.drsOpen') : t('live.drsClosed')}</span></div>
          </div>
          <TraceChart label={t('live.speed')} values={rows.map((r) => r.speed)} max={360} color={teamHex(d)} />
          <TraceChart label={t('live.throttle')} values={rows.map((r) => r.throttle)} max={100} color="#34c759" />
          <TraceChart label={t('live.brake')} values={rows.map((r) => r.brake)} max={100} color="#ff3b30" />
        </div>
      ) : null}
    </MCard>
  )
}

function TraceChart({ label, values, max, color }: { label: string; values: number[]; max: number; color: string }) {
  const W = 600, H = 70
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, values.length - 1)) * W).toFixed(1)} ${(H - (Math.min(v, max) / max) * H).toFixed(1)}`).join(' ')
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span className="m3-label-medium m3-muted">{label}</span>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label} style={{ height: 70 }}>
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  )
}
