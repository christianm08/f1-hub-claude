// Modello normalizzato OpenF1 per la UI — solo funzioni pure, nessuna rete.

import type {
  OF1Driver, OF1Interval, OF1Lap, OF1Pit, OF1Position, OF1RaceControl, OF1Session, OF1SessionResult, OF1Stint, OF1Weather,
} from './openf1'

// ───────── Nomi sessione ─────────
export type SessionCode = 'FP1' | 'FP2' | 'FP3' | 'SQ' | 'SPRINT' | 'Q' | 'RACE' | 'OTHER'

/** `session_name` non è stabile ("Practice 1" nel 2023, "FP1" nel 2026): normalizzarlo sempre. */
export function normalizeSessionName(name: string | undefined | null): SessionCode {
  const n = (name ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (/^(fp ?1|practice 1|free practice 1)$/.test(n)) return 'FP1'
  if (/^(fp ?2|practice 2|free practice 2)$/.test(n)) return 'FP2'
  if (/^(fp ?3|practice 3|free practice 3)$/.test(n)) return 'FP3'
  if (/sprint (qualifying|shootout)|^sq$|^sprint quali/.test(n)) return 'SQ'
  if (/^sprint( race)?$/.test(n)) return 'SPRINT'
  if (/^(qualifying|quali|q)$/.test(n)) return 'Q'
  if (/^(race|grand prix|gp)$/.test(n)) return 'RACE'
  return 'OTHER'
}

export function isRaceLike(code: SessionCode) {
  return code === 'RACE' || code === 'SPRINT'
}

// ───────── Stato pista (derivato dal race control: non esiste un campo booleano) ─────────
export type TrackStatus = 'GREEN' | 'YELLOW' | 'SC' | 'VSC' | 'VSC_ENDING' | 'SC_ENDING' | 'RED' | 'CHEQUERED' | 'UNKNOWN'

export function deriveTrackStatus(msgs: OF1RaceControl[]): TrackStatus {
  let status: TrackStatus = 'UNKNOWN'
  const sorted = [...msgs].sort((a, b) => a.date.localeCompare(b.date))
  for (const m of sorted) {
    const msg = (m.message ?? '').toUpperCase()
    const flag = (m.flag ?? '').toUpperCase()
    if (m.category === 'SafetyCar') {
      if (msg.includes('VIRTUAL') && msg.includes('ENDING')) status = 'VSC_ENDING'
      else if (msg.includes('VIRTUAL') && (msg.includes('DEPLOYED') || msg.includes('VSC DEPLOYED'))) status = 'VSC'
      else if (msg.includes('IN THIS LAP') || msg.includes('ENDING')) status = 'SC_ENDING'
      else if (msg.includes('DEPLOYED')) status = 'SC'
      continue
    }
    if (m.category === 'Flag' && m.scope === 'Track') {
      if (flag === 'RED') status = 'RED'
      else if (flag === 'GREEN' || flag === 'CLEAR') status = 'GREEN'
      else if (flag === 'CHEQUERED') status = 'CHEQUERED'
      continue
    }
    if (flag === 'CHEQUERED') status = 'CHEQUERED'
    if (flag === 'RED' && m.category === 'Flag') status = 'RED'
    if ((flag === 'GREEN' || flag === 'CLEAR') && m.scope === 'Track') status = 'GREEN'
  }
  if (status === 'UNKNOWN' && sorted.length) {
    // con messaggi ma senza eventi di stato: bandiere gialle di settore attive?
    const last = sorted[sorted.length - 1]
    if ((last.flag ?? '').toUpperCase().includes('YELLOW')) return 'YELLOW'
    return 'GREEN'
  }
  return status
}

// ───────── Utility ─────────
export function latestBy<T extends { driver_number: number; date: string }>(rows: T[]): Map<number, T> {
  const m = new Map<number, T>()
  for (const r of rows) {
    const ex = m.get(r.driver_number)
    if (!ex || ex.date <= r.date) m.set(r.driver_number, r)
  }
  return m
}

/** stato "al tempo t" per il replay: ultimo valore con date <= t */
export function latestAt<T extends { driver_number: number; date: string }>(rows: T[], t: string | null): Map<number, T> {
  return t ? latestBy(rows.filter((r) => r.date <= t)) : latestBy(rows)
}

export function fmtLap(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return m ? `${m}:${s.toFixed(3).padStart(6, '0')}` : s.toFixed(3)
}

export function fmtGap(g: number | string | null | undefined): string {
  if (g == null) return '—'
  if (typeof g === 'string') return g // es. "+1 LAP"
  return `+${g.toFixed(3)}`
}

export function teamHex(d?: OF1Driver): string {
  return d?.team_colour ? `#${d.team_colour.replace('#', '')}` : '#8a8f98'
}

export const COMPOUND_CLASS: Record<string, string> = { SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' }

// ───────── Timing tower ─────────
export interface TowerRow {
  driver: OF1Driver
  position: number | null
  gap: number | string | null
  interval: number | string | null
  bestLap: number | null
  lastLap: number | null
  laps: number
  pits: number
  compound: string | null
  tyreAge: number | null
  inPit: boolean
  status: 'running' | 'DNF' | 'DNS' | 'DSQ'
}

export interface ModelInput {
  drivers: OF1Driver[]
  positions: OF1Position[]
  intervals: OF1Interval[]
  laps: OF1Lap[]
  stints: OF1Stint[]
  pits: OF1Pit[]
  results: OF1SessionResult[]
  /** istante del replay (ISO) — null = stato finale/più recente */
  at: string | null
}

export function currentLapAt(laps: OF1Lap[], at: string | null): number {
  let max = 0
  for (const l of laps) {
    if (at && l.date_start && l.date_start > at) continue
    if (l.lap_number > max) max = l.lap_number
  }
  return max
}

export function buildTower(inp: ModelInput): TowerRow[] {
  const pos = latestAt(inp.positions, inp.at)
  const iv = latestAt(inp.intervals, inp.at)
  const finalRes = new Map(inp.results.map((r) => [r.driver_number, r]))
  const useFinal = inp.at === null && inp.results.length > 0

  const lapsBy = new Map<number, OF1Lap[]>()
  for (const l of inp.laps) {
    if (inp.at && l.date_start && l.date_start > inp.at) continue
    const arr = lapsBy.get(l.driver_number) ?? []
    arr.push(l)
    lapsBy.set(l.driver_number, arr)
  }

  const rows = inp.drivers.map<TowerRow>((d) => {
    const dl = (lapsBy.get(d.driver_number) ?? []).sort((a, b) => a.lap_number - b.lap_number)
    const valid = dl.map((l) => l.lap_duration).filter((x): x is number => typeof x === 'number' && x > 0)
    const lapNo = dl.length ? dl[dl.length - 1].lap_number : 0
    const st = inp.stints
      .filter((s) => s.driver_number === d.driver_number && s.lap_start <= Math.max(lapNo, 1))
      .sort((a, b) => b.stint_number - a.stint_number)[0]
    const pits = inp.pits.filter((p) => p.driver_number === d.driver_number && (!inp.at || p.date <= inp.at))
    const lastPit = pits[pits.length - 1]
    const res = finalRes.get(d.driver_number)
    const status: TowerRow['status'] = res?.dsq ? 'DSQ' : res?.dns ? 'DNS' : res?.dnf ? 'DNF' : 'running'
    const gapFinal = Array.isArray(res?.gap_to_leader) ? res!.gap_to_leader[res!.gap_to_leader.length - 1] : res?.gap_to_leader
    return {
      driver: d,
      position: useFinal && res?.position != null ? res.position : pos.get(d.driver_number)?.position ?? null,
      gap: useFinal && gapFinal !== undefined ? (gapFinal as number | string | null) : iv.get(d.driver_number)?.gap_to_leader ?? null,
      interval: iv.get(d.driver_number)?.interval ?? null,
      bestLap: valid.length ? Math.min(...valid) : null,
      lastLap: valid.length ? valid[valid.length - 1] : null,
      laps: lapNo,
      pits: pits.length,
      compound: st?.compound ?? null,
      tyreAge: st ? (st.tyre_age_at_start ?? 0) + Math.max(0, lapNo - st.lap_start) : null,
      inPit: !!lastPit && dl.length > 0 && dl[dl.length - 1].lap_number <= lastPit.lap_number && !useFinal && !!inp.at,
      status,
    }
  })
  return rows.sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
}

/** best lap della sessione per pilota (prove libere / qualifiche) */
export function bestLaps(drivers: OF1Driver[], laps: OF1Lap[]) {
  const out = drivers
    .map((d) => {
      const own = laps.filter((l) => l.driver_number === d.driver_number && l.lap_duration && l.lap_duration > 0)
      const best = own.reduce<OF1Lap | null>((b, l) => (!b || (l.lap_duration ?? 1e9) < (b.lap_duration ?? 1e9) ? l : b), null)
      return { driver: d, best: best?.lap_duration ?? null, lapNumber: best?.lap_number ?? null, laps: own.length, s1: best?.duration_sector_1 ?? null, s2: best?.duration_sector_2 ?? null, s3: best?.duration_sector_3 ?? null }
    })
    .sort((a, b) => (a.best ?? 1e9) - (b.best ?? 1e9))
  const top = out[0]?.best ?? null
  return out.map((r) => ({ ...r, gap: r.best != null && top != null ? r.best - top : null }))
}

export function latestWeather(rows: OF1Weather[], at: string | null): OF1Weather | null {
  const f = at ? rows.filter((w) => w.date <= at) : rows
  return f.length ? f.reduce((a, b) => (a.date >= b.date ? a : b)) : null
}

/** Mappa del circuito: normalizza le coordinate `location` (unità non metri, origine arbitraria)
 *  in un viewBox relativo al bounding box. */
export function fitToBox(points: { x: number; y: number }[], size = 1000, pad = 40) {
  if (!points.length) return { tx: (x: number) => x, ty: (y: number) => y, w: size, h: size }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const k = (size - pad * 2) / span
  const w = (maxX - minX) * k + pad * 2
  const h = (maxY - minY) * k + pad * 2
  return { tx: (x: number) => (x - minX) * k + pad, ty: (y: number) => h - ((y - minY) * k + pad), w, h }
}

export function sessionLabel(s: Pick<OF1Session, 'session_name'>): SessionCode {
  return normalizeSessionName(s.session_name)
}
