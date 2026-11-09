// Refresh intelligente del Race Center + hook useRaceCenterSession.
// Canali con intervalli differenziati e aggiornamenti differenziali (finestre `date>` per il solo delta).
// Il replay di una sessione conclusa fa un full-load + max 2 rivalidazioni, poi si ferma.
// LIVE_REQUIRES_PAID: sul piano gratuito la finestra ±30 min è riservata → stato needsSubscription.
// MAI dati simulati.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from './client'
import {
  openf1, LIVE_REQUIRES_PAID, LIVE_WINDOW_MS,
  type OF1Driver, type OF1Interval, type OF1Lap, type OF1Overtake, type OF1Pit, type OF1Position, type OF1RaceControl,
  type OF1Session, type OF1SessionResult, type OF1StartingGrid, type OF1Stint, type OF1TeamRadio, type OF1Weather,
} from './openf1'
import { normalizeSessionName } from './openf1model'

export type RCStatus = 'idle' | 'loading' | 'live' | 'ready' | 'needsSubscription' | 'error'

export interface RCData {
  session: OF1Session | null
  drivers: OF1Driver[]
  positions: OF1Position[]
  intervals: OF1Interval[]
  laps: OF1Lap[]
  stints: OF1Stint[]
  pits: OF1Pit[]
  weather: OF1Weather[]
  raceControl: OF1RaceControl[]
  teamRadio: OF1TeamRadio[]
  results: OF1SessionResult[]
  overtakes: OF1Overtake[]
  grid: OF1StartingGrid[]
}

const EMPTY: RCData = {
  session: null, drivers: [], positions: [], intervals: [], laps: [], stints: [], pits: [], weather: [],
  raceControl: [], teamRadio: [], results: [], overtakes: [], grid: [],
}

/** Budget profilo standard ≈ 22,5 req/min (sotto il cap di 25/min del token bucket). */
export const CHANNELS = {
  positions: 8_000,
  intervals: 12_000,
  raceControl: 20_000,
  pits: 30_000,
  stints: 30_000,
  laps: 60_000,
  weather: 120_000,
  results: 120_000,
  teamRadio: 120_000,
  overtakes: 120_000,
} as const
type Channel = keyof typeof CHANNELS

export function liveWindow(s: Pick<OF1Session, 'date_start' | 'date_end'>, now = Date.now()) {
  const a = new Date(s.date_start).getTime() - LIVE_WINDOW_MS
  const b = new Date(s.date_end).getTime() + LIVE_WINDOW_MS
  return now >= a && now <= b
}

export function sessionEnded(s: Pick<OF1Session, 'date_end'>, now = Date.now()) {
  return now > new Date(s.date_end).getTime() + LIVE_WINDOW_MS
}

function maxDate<T extends { date: string }>(rows: T[]): string | undefined {
  let m: string | undefined
  for (const r of rows) if (!m || r.date > m) m = r.date
  return m
}

function mergeByDate<T extends { date: string }>(a: T[], b: T[], key: (r: T) => string): T[] {
  if (!b.length) return a
  const seen = new Set(a.map(key))
  return [...a, ...b.filter((r) => !seen.has(key(r)))]
}

function isPaywall(err: unknown) {
  return err instanceof ApiError && (err.status === 401 || err.status === 403)
}

async function findQualiKey(session: OF1Session, signal: AbortSignal): Promise<number | null> {
  const list = await openf1.sessions({ meeting_key: session.meeting_key }, { signal })
  const q = list.find((s) => normalizeSessionName(s.session_name) === (normalizeSessionName(session.session_name) === 'SPRINT' ? 'SQ' : 'Q'))
  return q?.session_key ?? null
}

async function fullLoad(session: OF1Session, signal: AbortSignal): Promise<RCData> {
  const k = { session_key: session.session_key }
  const o = { signal, ttl: sessionEnded(session) ? 7 * 86_400_000 : 60_000 }
  const code = normalizeSessionName(session.session_name)
  const [drivers, positions, intervals, laps, stints, pits, weather, raceControl, teamRadio, results, overtakes] = await Promise.all([
    openf1.drivers(session.session_key, { signal }),
    openf1.position(k, o),
    code === 'RACE' || code === 'SPRINT' ? openf1.intervals(k, o) : Promise.resolve([] as OF1Interval[]),
    openf1.laps(k, o),
    openf1.stints(k, o),
    openf1.pit(k, o),
    openf1.weather(k, o),
    openf1.raceControl(k, o),
    openf1.teamRadio(k, o),
    openf1.sessionResult(k, o),
    code === 'RACE' || code === 'SPRINT' ? openf1.overtakes(k, o) : Promise.resolve([] as OF1Overtake[]),
  ])
  let grid: OF1StartingGrid[] = []
  if (code === 'RACE' || code === 'SPRINT') {
    const qk = await findQualiKey(session, signal).catch(() => null)
    if (qk) grid = await openf1.startingGrid(qk, { signal, ttl: o.ttl }).catch(() => [])
  }
  return { session, drivers: dedupeDrivers(drivers), positions, intervals, laps, stints, pits, weather, raceControl, teamRadio, results, overtakes, grid }
}

function dedupeDrivers(ds: OF1Driver[]) {
  const m = new Map<number, OF1Driver>()
  for (const d of ds) m.set(d.driver_number, d)
  return [...m.values()].sort((a, b) => a.driver_number - b.driver_number)
}

export interface RCState {
  status: RCStatus
  data: RCData
  error: string | null
  lastUpdate: number | null
  revalidations: number
}

/**
 * Hook principale del Race Center.
 * - sessione conclusa → full-load + max 2 rivalidazioni → `ready`
 * - sessione in finestra live → tenta il live; sul piano gratuito → `needsSubscription`
 */
export function useRaceCenterSession(sessionKey: number | null, opts: { autoRefresh: boolean }) {
  const [state, setState] = useState<RCState>({ status: 'idle', data: EMPTY, error: null, lastUpdate: null, revalidations: 0 })
  const dataRef = useRef<RCData>(EMPTY)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!sessionKey) {
      setState({ status: 'idle', data: EMPTY, error: null, lastUpdate: null, revalidations: 0 })
      return
    }
    const ac = new AbortController()
    const timers: ReturnType<typeof setTimeout>[] = []
    let stopped = false
    setState((s) => ({ ...s, status: 'loading', error: null }))

    const set = (patch: Partial<RCData>, status?: RCStatus) => {
      dataRef.current = { ...dataRef.current, ...patch }
      setState((s) => ({ ...s, data: dataRef.current, status: status ?? s.status, lastUpdate: Date.now() }))
    }

    ;(async () => {
      try {
        const [session] = await openf1.sessions({ session_key: sessionKey }, { signal: ac.signal })
        if (!session) throw new Error('Sessione non trovata')
        dataRef.current = { ...EMPTY, session }

        if (liveWindow(session)) {
          // Finestra live: sul piano gratuito OpenF1 non serve dati. Proviamo una sola chiamata leggera.
          let probe: OF1Position[] = []
          try {
            probe = await openf1.position({ session_key: sessionKey }, { signal: ac.signal, ttl: 5_000, memoryOnly: true })
          } catch (e) {
            if (isPaywall(e) || LIVE_REQUIRES_PAID) {
              set({}, 'needsSubscription')
              return
            }
            throw e
          }
          if (!probe.length && LIVE_REQUIRES_PAID) {
            set({}, 'needsSubscription')
            return
          }
          const first = await fullLoad(session, ac.signal)
          set(first, 'live')
          if (opts.autoRefresh) startLive(session)
          return
        }

        const data = await fullLoad(session, ac.signal)
        set(data, 'ready')
        // Rivalidazioni (max 2) solo se la sessione è terminata da poco: i dati possono essere ancora in completamento.
        const endedAgo = Date.now() - new Date(session.date_end).getTime()
        if (endedAgo < 6 * 3_600_000) {
          ;[90_000, 240_000].forEach((ms, i) =>
            timers.push(
              setTimeout(async () => {
                if (stopped) return
                try {
                  const again = await fullLoad({ ...session }, ac.signal)
                  set(again)
                  setState((s) => ({ ...s, revalidations: i + 1 }))
                } catch {
                  /* rivalidazione fallita: restano i dati veri già caricati */
                }
              }, ms),
            ),
          )
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        if (isPaywall(e)) {
          setState((s) => ({ ...s, status: 'needsSubscription' }))
          return
        }
        setState((s) => ({ ...s, status: 'error', error: (e as Error).message }))
      }
    })()

    function startLive(session: OF1Session) {
      const k = session.session_key
      const tick = async (ch: Channel) => {
        if (stopped) return
        const d = dataRef.current
        const o = { signal: ac.signal, ttl: Math.min(CHANNELS[ch] - 1000, 60_000), memoryOnly: true, force: true }
        try {
          switch (ch) {
            case 'positions': {
              const rows = await openf1.position({ session_key: k, 'date>': maxDate(d.positions) }, o)
              set({ positions: mergeByDate(d.positions, rows, (r) => `${r.driver_number}|${r.date}`) })
              break
            }
            case 'intervals': {
              const rows = await openf1.intervals({ session_key: k, 'date>': maxDate(d.intervals) }, o)
              set({ intervals: mergeByDate(d.intervals, rows, (r) => `${r.driver_number}|${r.date}`) })
              break
            }
            case 'raceControl': {
              const rows = await openf1.raceControl({ session_key: k, 'date>': maxDate(d.raceControl) }, o)
              set({ raceControl: mergeByDate(d.raceControl, rows, (r) => `${r.date}|${r.message}`) })
              break
            }
            case 'pits': {
              const rows = await openf1.pit({ session_key: k, 'date>': maxDate(d.pits) }, o)
              set({ pits: mergeByDate(d.pits, rows, (r) => `${r.driver_number}|${r.lap_number}`) })
              break
            }
            case 'stints':
              set({ stints: await openf1.stints({ session_key: k }, o) })
              break
            case 'laps': {
              const lastLap = d.laps.reduce((m, l) => Math.max(m, l.lap_number), 0)
              const rows = await openf1.laps({ session_key: k, 'lap_number>': Math.max(0, lastLap - 1) }, o)
              const key = (l: OF1Lap) => `${l.driver_number}|${l.lap_number}`
              const map = new Map(d.laps.map((l) => [key(l), l]))
              rows.forEach((l) => map.set(key(l), l))
              set({ laps: [...map.values()] })
              break
            }
            case 'weather': {
              const rows = await openf1.weather({ session_key: k, 'date>': maxDate(d.weather) }, o)
              set({ weather: mergeByDate(d.weather, rows, (r) => r.date) })
              break
            }
            case 'results':
              set({ results: await openf1.sessionResult({ session_key: k }, o) })
              break
            case 'teamRadio': {
              const rows = await openf1.teamRadio({ session_key: k, 'date>': maxDate(d.teamRadio) }, o)
              set({ teamRadio: mergeByDate(d.teamRadio, rows, (r) => r.recording_url) })
              break
            }
            case 'overtakes': {
              const rows = await openf1.overtakes({ session_key: k, 'date>': maxDate(d.overtakes) }, o)
              set({ overtakes: mergeByDate(d.overtakes, rows, (r) => `${r.date}|${r.overtaking_driver_number}`) })
              break
            }
          }
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          if (isPaywall(e)) {
            stopped = true
            setState((s) => ({ ...s, status: 'needsSubscription' }))
            return
          }
        }
        if (!stopped && !sessionEnded(session)) timers.push(setTimeout(() => tick(ch), CHANNELS[ch]))
        else if (sessionEnded(session)) setState((s) => ({ ...s, status: 'ready' }))
      }
      ;(Object.keys(CHANNELS) as Channel[]).forEach((ch, i) => timers.push(setTimeout(() => tick(ch), CHANNELS[ch] + i * 400)))
    }

    return () => {
      stopped = true
      ac.abort()
      timers.forEach(clearTimeout)
    }
  }, [sessionKey, opts.autoRefresh, nonce])

  return useMemo(() => ({ ...state, reload: () => setNonce((n) => n + 1) }), [state])
}

/** Trova la sessione attualmente in finestra live (se esiste) tra quelle dell'anno corrente. */
export async function detectLiveSession(signal?: AbortSignal): Promise<OF1Session | null> {
  const year = new Date().getUTCFullYear()
  const list = await openf1.sessions({ year }, { signal, ttl: 10 * 60_000 })
  const now = Date.now()
  return list.find((s) => liveWindow(s, now)) ?? null
}
