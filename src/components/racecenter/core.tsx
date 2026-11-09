// Pannelli core del Race Center (sempre montati).

import { useMemo } from 'react'
import type { RCData } from '../../api/openf1live'
import {
  COMPOUND_CLASS, buildTower, currentLapAt, deriveTrackStatus, fmtGap, fmtLap, latestWeather, normalizeSessionName, teamHex,
  type TowerRow, type TrackStatus,
} from '../../api/openf1model'
import type { OF1Driver } from '../../api/openf1'
import { useSettings } from '../../store/settings'
import { MBadge, MCard, MEmptyState, MIcon, type IconName } from '../../design'
import { FlagIcon } from '../FlagIcon'
import { FIA_TO_ISO2 } from '../../data/meta'

const timeOf = (iso: string, locale: string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso))

export function Tyre({ compound }: { compound: string | null }) {
  const c = compound ? COMPOUND_CLASS[compound.toUpperCase()] ?? 'U' : 'U'
  return <span className={`tyre tyre--${c}`} title={compound ?? 'n/d'}>{c === 'U' ? '?' : c}</span>
}

export function useTower(data: RCData, at: string | null) {
  return useMemo(() => buildTower({ ...data, at }), [data, at])
}

// ───────── TimingTower ─────────
export function TimingTower({ rows, selected, onSelect, raceLike }: { rows: TowerRow[]; selected: number | null; onSelect: (n: number) => void; raceLike: boolean }) {
  const { t } = useSettings()
  if (!rows.length) return <MEmptyState icon="table_rows" title={t('common.empty')} />
  return (
    <div className="tower" role="list" aria-label={t('live.tab.timing')}>
      {rows.map((r) => (
        <button
          key={r.driver.driver_number}
          type="button"
          role="listitem"
          className="tower__row"
          aria-pressed={selected === r.driver.driver_number}
          onClick={() => onSelect(r.driver.driver_number)}
        >
          <span className="pos">{r.status !== 'running' ? r.status : r.position ?? '—'}</span>
          <span className="team-bar" style={{ background: teamHex(r.driver), minHeight: 22 }} />
          <span className="row" style={{ gap: 8, minWidth: 0 }}>
            <b className="mono">{r.driver.name_acronym}</b>
            <span className="m3-body-small m3-muted ellipsis">{r.driver.last_name ?? r.driver.broadcast_name}</span>
            {r.inPit && <MBadge tone="primary">{t('live.inPit')}</MBadge>}
          </span>
          <span className="tower__extra">
            <Tyre compound={r.compound} />
            <span className="m3-body-small m3-muted mono" style={{ minWidth: 18 }}>{r.tyreAge ?? ''}</span>
          </span>
          <span className="tower__gap">
            {raceLike ? (r.position === 1 ? <span className="m3-muted">{r.laps ? `L${r.laps}` : '—'}</span> : fmtGap(r.interval ?? r.gap)) : fmtLap(r.bestLap)}
          </span>
        </button>
      ))}
    </div>
  )
}

// ───────── FlagBanner ─────────
const FLAG_ICON: Record<TrackStatus, IconName> = { GREEN: 'flag', YELLOW: 'warning', SC: 'directions_car', VSC: 'directions_car', VSC_ENDING: 'directions_car', SC_ENDING: 'directions_car', RED: 'flag_fill', CHEQUERED: 'sports_score', UNKNOWN: 'help' }

export function FlagBanner({ data, at }: { data: RCData; at: string | null }) {
  const { t } = useSettings()
  const status = useMemo(() => deriveTrackStatus(at ? data.raceControl.filter((m) => m.date <= at) : data.raceControl), [data.raceControl, at])
  const lap = currentLapAt(data.laps, at)
  return (
    <div className={`flagbanner flagbanner--${status}`} role="status" aria-live="polite">
      <MIcon name={FLAG_ICON[status]} />
      <span className="grow">{t(`live.flag.${status}`)}</span>
      {lap > 0 && <span className="mono">{t('common.lap')} {lap}</span>}
    </div>
  )
}

// ───────── WeatherPanel ─────────
export function WeatherPanel({ data, at }: { data: RCData; at: string | null }) {
  const { t, units, locale } = useSettings()
  const w = latestWeather(data.weather, at)
  if (!w) return <MCard title={t('live.weather')}><MEmptyState icon="cloud" title={t('common.empty')} /></MCard>
  const temp = (c: number) => (units === 'metric' ? `${c.toFixed(1)} °C` : `${(c * 9 / 5 + 32).toFixed(1)} °F`)
  const wind = units === 'metric' ? `${(w.wind_speed * 3.6).toFixed(0)} km/h` : `${(w.wind_speed * 2.23694).toFixed(0)} mph`
  const cells: [IconName, string, string][] = [
    ['thermostat', t('live.air'), temp(w.air_temperature)],
    ['local_gas_station', t('live.track'), temp(w.track_temperature)],
    ['water_drop', t('live.humidity'), `${w.humidity.toFixed(0)}%`],
    ['air', t('live.wind'), `${wind} · ${w.wind_direction}°`],
    ['rainy', t('live.rain'), w.rainfall ? t('live.yes') : t('live.no')],
    ['speed', t('live.pressure'), `${w.pressure.toFixed(0)} mbar`],
  ]
  return (
    <MCard title={t('live.weather')} action={<span className="m3-body-small m3-muted">{timeOf(w.date, locale)}</span>}>
      <div className="weather-grid">
        {cells.map(([ic, l, v]) => (
          <div className="stat" key={l}>
            <span className="row m3-body-small m3-muted" style={{ gap: 4 }}><MIcon name={ic} size={16} />{l}</span>
            <b className="m3-title-medium">{v}</b>
          </div>
        ))}
      </div>
    </MCard>
  )
}

// ───────── RaceControlPanel ─────────
export function RaceControlPanel({ data, at }: { data: RCData; at: string | null }) {
  const { t, locale } = useSettings()
  const msgs = (at ? data.raceControl.filter((m) => m.date <= at) : data.raceControl).slice().sort((a, b) => b.date.localeCompare(a.date))
  return (
    <MCard title={t('live.raceControl')}>
      {!msgs.length ? <MEmptyState icon="info" title={t('live.noEvents')} /> : (
        <div className="rc-feed">
          {msgs.map((m, i) => (
            <div className="rc-feed__item" key={`${m.date}-${i}`}>
              <span className="rc-feed__time">{timeOf(m.date, locale)}{m.lap_number ? <><br />L{m.lap_number}</> : null}</span>
              <span>{m.flag && <MBadge tone={m.flag === 'RED' ? 'error' : undefined}>{m.flag}</MBadge>} {m.message}</span>
            </div>
          ))}
        </div>
      )}
    </MCard>
  )
}

// ───────── PitTimeline ─────────
export function PitTimeline({ data, at, drivers }: { data: RCData; at: string | null; drivers: Map<number, OF1Driver> }) {
  const { t, locale } = useSettings()
  const pits = (at ? data.pits.filter((p) => p.date <= at) : data.pits).slice().sort((a, b) => b.date.localeCompare(a.date))
  return (
    <MCard title={t('live.pitStops')}>
      {!pits.length ? <MEmptyState icon="build" title={t('live.noEvents')} /> : (
        <div className="rc-feed">
          {pits.map((p, i) => {
            const d = drivers.get(p.driver_number)
            const dur = p.pit_duration ?? p.lane_duration ?? null
            return (
              <div className="rc-feed__item" key={`${p.driver_number}-${p.lap_number}-${i}`}>
                <span className="rc-feed__time">{timeOf(p.date, locale)}<br />L{p.lap_number}</span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="team-bar" style={{ background: teamHex(d), minHeight: 18 }} />
                  <b className="mono">{d?.name_acronym ?? p.driver_number}</b>
                  <span className="grow" />
                  <span className="mono">{dur != null ? `${dur.toFixed(1)} s` : '—'}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="note">{t('live.pitDuration')}</p>
    </MCard>
  )
}

// ───────── StrategyView ─────────
export function StrategyView({ data, rows }: { data: RCData; rows: TowerRow[] }) {
  const { t } = useSettings()
  const total = Math.max(1, ...data.stints.map((s) => s.lap_end || 0), ...data.laps.map((l) => l.lap_number))
  if (!data.stints.length) return <MCard title={t('live.stints')}><MEmptyState icon="tire_repair" title={t('common.empty')} /></MCard>
  return (
    <MCard title={t('live.stints')}>
      <div className="stack" style={{ gap: 6 }}>
        {rows.map((r) => {
          const st = data.stints.filter((s) => s.driver_number === r.driver.driver_number).sort((a, b) => a.stint_number - b.stint_number)
          return (
            <div className="stint-row" key={r.driver.driver_number}>
              <b className="mono">{r.driver.name_acronym}</b>
              <div className="stint-track" aria-label={`${r.driver.name_acronym}: ${st.map((s) => `${s.compound ?? '?'} ${s.lap_start}-${s.lap_end}`).join(', ')}`}>
                {st.map((s) => {
                  const c = s.compound ? COMPOUND_CLASS[s.compound.toUpperCase()] ?? 'U' : 'U'
                  const color = { S: '#ff3b30', M: '#ffd60a', H: '#f2f2f2', I: '#34c759', W: '#32ade6', U: '#8a8f98' }[c]
                  const end = s.lap_end || total
                  return (
                    <span key={s.stint_number} className="stint-seg" title={`${s.compound ?? 'n/d'} · L${s.lap_start}–${end}`} style={{ left: `${((s.lap_start - 1) / total) * 100}%`, width: `${((end - s.lap_start + 1) / total) * 100}%`, background: color }}>
                      {end - s.lap_start > 3 ? c : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </MCard>
  )
}

// ───────── LapTiming ─────────
export function LapTiming({ data, driver, at }: { data: RCData; driver: OF1Driver | null; at: string | null }) {
  const { t } = useSettings()
  if (!driver) return <MCard title={t('live.lapTimes')}><MEmptyState icon="person" title={t('live.selectDriver')} /></MCard>
  const laps = data.laps
    .filter((l) => l.driver_number === driver.driver_number && (!at || !l.date_start || l.date_start <= at))
    .sort((a, b) => b.lap_number - a.lap_number)
  const best = Math.min(...laps.map((l) => l.lap_duration ?? Infinity))
  return (
    <MCard title={`${t('live.lapTimes')} · ${driver.name_acronym}`}>
      {!laps.length ? <MEmptyState icon="timer" title={t('common.empty')} /> : (
        <div className="m3-table-wrap" style={{ maxHeight: 420 }}>
          <table className="m3-table">
            <thead><tr><th>{t('common.lap')}</th><th>{t('common.time')}</th><th>S1</th><th>S2</th><th>S3</th><th className="num">ST</th></tr></thead>
            <tbody>
              {laps.map((l) => (
                <tr key={l.lap_number} className={l.lap_duration === best ? 'is-highlight' : undefined}>
                  <td className="mono">{l.lap_number}{l.is_pit_out_lap ? ' ·OUT' : ''}</td>
                  <td className="mono">{fmtLap(l.lap_duration)}</td>
                  <td className="mono">{fmtLap(l.duration_sector_1)}</td>
                  <td className="mono">{fmtLap(l.duration_sector_2)}</td>
                  <td className="mono">{fmtLap(l.duration_sector_3)}</td>
                  <td className="mono num">{l.st_speed ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MCard>
  )
}

// ───────── UnifiedTimeline ─────────
type Ev = { date: string; icon: IconName; text: string; tone?: 'error' | 'primary' }
export function UnifiedTimeline({ data, at, drivers }: { data: RCData; at: string | null; drivers: Map<number, OF1Driver> }) {
  const { t, locale } = useSettings()
  const ac = (n: number) => drivers.get(n)?.name_acronym ?? `#${n}`
  const evs: Ev[] = [
    ...data.raceControl.filter((m) => m.category === 'SafetyCar' || m.flag === 'RED' || m.flag === 'CHEQUERED' || m.category === 'Drs').map<Ev>((m) => ({ date: m.date, icon: m.flag === 'RED' ? 'flag_fill' : m.category === 'SafetyCar' ? 'directions_car' : 'flag', text: m.message, tone: m.flag === 'RED' ? 'error' : undefined })),
    ...data.pits.map<Ev>((p) => ({ date: p.date, icon: 'build', text: `${ac(p.driver_number)} · ${t('live.pitStops')} L${p.lap_number}${p.pit_duration ? ` · ${p.pit_duration.toFixed(1)} s` : ''}` })),
    ...data.overtakes.map<Ev>((o) => ({ date: o.date, icon: 'trending_up', text: `${ac(o.overtaking_driver_number)} → ${ac(o.overtaken_driver_number)} · P${o.position}`, tone: 'primary' })),
  ]
    .filter((e) => !at || e.date <= at)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 200)
  return (
    <MCard title={t('live.timeline')}>
      {!evs.length ? <MEmptyState icon="timeline" title={t('live.noEvents')} /> : (
        <div className="rc-feed">
          {evs.map((e, i) => (
            <div className="rc-feed__item" key={i}>
              <span className="rc-feed__time">{timeOf(e.date, locale)}</span>
              <span className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <MIcon name={e.icon} size={18} style={{ color: e.tone === 'error' ? 'var(--md-sys-color-error)' : e.tone === 'primary' ? 'var(--md-sys-color-primary)' : undefined, flex: 'none' }} />
                <span>{e.text}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </MCard>
  )
}

// ───────── DriverPanel ─────────
export function DriverPanel({ row, data }: { row: TowerRow | null; data: RCData }) {
  const { t } = useSettings()
  if (!row) return <MCard title={t('live.tab.driver')}><MEmptyState icon="person" title={t('live.selectDriver')} /></MCard>
  const d = row.driver
  const grid = data.grid.find((g) => g.driver_number === d.driver_number)
  const ots = data.overtakes.filter((o) => o.overtaking_driver_number === d.driver_number).length
  return (
    <MCard title={<div className="row" style={{ gap: 10 }}>
      {/* niente headshot_url: sono asset proprietari F1, non ridistribuibili */}
      <span className="avatar" style={{ width: 44, background: teamHex(d) }}><span className="avatar__ph">{d.name_acronym}</span></span>
      <div className="stack" style={{ gap: 0 }}>
        <span className="m3-title-medium">{d.full_name}</span>
        <span className="row m3-body-small m3-muted"><FlagIcon iso2={FIA_TO_ISO2[d.country_code ?? '']} code={d.country_code ?? '—'} />#{d.driver_number} · {d.team_name}</span>
      </div>
    </div>}>
      <dl className="kv">
        <dt>{t('common.pos')}</dt><dd>{row.status !== 'running' ? row.status : row.position ?? '—'}</dd>
        {grid && <><dt>{t('live.startingGrid')}</dt><dd>P{grid.position}</dd></>}
        <dt>{t('common.gap')}</dt><dd className="mono">{fmtGap(row.gap)}</dd>
        <dt>{t('common.interval')}</dt><dd className="mono">{fmtGap(row.interval)}</dd>
        <dt>{t('common.best')}</dt><dd className="mono">{fmtLap(row.bestLap)}</dd>
        <dt>{t('common.last')}</dt><dd className="mono">{fmtLap(row.lastLap)}</dd>
        <dt>{t('common.laps')}</dt><dd>{row.laps}</dd>
        <dt>{t('live.pitStops')}</dt><dd>{row.pits}</dd>
        <dt>{t('live.tyre')}</dt><dd className="row" style={{ justifyContent: 'flex-end' }}><Tyre compound={row.compound} />{row.tyreAge != null && <span className="mono">{row.tyreAge} {t('common.laps').toLowerCase()}</span>}</dd>
        {data.overtakes.length > 0 && <><dt>{t('live.overtakes')}</dt><dd>{ots}</dd></>}
      </dl>
      <p className="note" style={{ marginTop: 8 }}>{t('common.source')}: OpenF1</p>
    </MCard>
  )
}

export function isRaceLikeSession(name?: string) {
  const c = normalizeSessionName(name)
  return c === 'RACE' || c === 'SPRINT'
}
