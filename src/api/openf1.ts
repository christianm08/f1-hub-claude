// Client OpenF1 tipizzato — https://api.openf1.org/v1/
// Piano gratuito (limiti verificati): 3 req/s, 30 req/min, nessun dato live nella finestra
// [inizio−30 min, fine+30 min] (riservata al piano a pagamento), storico solo dal 2023.
//
// Il client applica:
//  - token bucket condiviso 25 req/min + 3 req/s su TUTTE le chiamate
//  - dedup delle richieste identiche in volo (in fetchJSON)
//  - retry con backoff esponenziale (max 3) e rispetto di Retry-After sui 429
//  - 404 {"detail":"No results found."} = insieme vuoto, mai errore
//
// QUIRK CRITICO: i docs scrivono `date>=...`, ma il server spezza la query sul primo `=`.
// Per i filtri di intervallo la chiave deve essere `date>` singolo (codificato `date%3E=...`).

import { ApiError, fetchJSON, DAY, type FetchOptions } from './client'

const BASE = 'https://api.openf1.org/v1'
export const OPENF1_FIRST_YEAR = 2023
export const LIVE_REQUIRES_PAID = true
export const LIVE_WINDOW_MS = 30 * 60_000

// ───────── Rate limiter (token bucket) ─────────
const PER_MIN = 25
const PER_SEC = 3
const stampsMin: number[] = []
const queue: (() => void)[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function pump() {
  timer = null
  const now = Date.now()
  while (stampsMin.length && now - stampsMin[0] >= 60_000) stampsMin.shift()
  while (queue.length) {
    const lastSec = stampsMin.filter((t) => now - t < 1000).length
    if (stampsMin.length >= PER_MIN || lastSec >= PER_SEC) break
    stampsMin.push(now)
    queue.shift()!()
  }
  if (queue.length) {
    const waitMin = stampsMin.length >= PER_MIN ? 60_000 - (now - stampsMin[0]) + 5 : 0
    const recent = stampsMin.filter((t) => now - t < 1000)
    const waitSec = recent.length >= PER_SEC ? 1000 - (now - recent[0]) + 5 : 0
    timer = setTimeout(pump, Math.max(waitMin, waitSec, 20))
  }
}

function acquire(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const go = () => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }
    const onAbort = () => {
      const i = queue.indexOf(go)
      if (i >= 0) queue.splice(i, 1)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    queue.push(go)
    if (!timer) pump()
  })
}

/** richieste in coda (per diagnostica UI) */
export function openf1QueueLength() {
  return queue.length
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Params = Record<string, string | number | undefined | null>

/** Costruisce la query string rispettando il quirk degli operatori di confronto. */
export function buildQuery(params: Params): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    // chiavi tipo "date>" o "lap_number<" → `date%3E=valore` (operatore codificato nella chiave)
    const m = /^(.*?)(>=|<=|>|<)$/.exec(k)
    if (m) {
      const op = m[2][0] // >= viene ridotto a > (il server non supporta >= nella chiave)
      parts.push(`${encodeURIComponent(m[1] + op)}=${encodeURIComponent(String(v))}`)
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    }
  }
  return parts.length ? '?' + parts.join('&') : ''
}

export async function of1<T>(endpoint: string, params: Params = {}, opts: FetchOptions = {}): Promise<T[]> {
  const url = `${BASE}/${endpoint}${buildQuery(params)}`
  let attempt = 0
  for (;;) {
    await acquire(opts.signal)
    try {
      return await fetchJSON<T[]>(url, { ...opts, emptyOn: [404], emptyValue: [] })
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
      // 401/403 sulle sessioni in corso = finestra live riservata al piano a pagamento
      if (err.status === 401 || err.status === 403) throw err
      if (attempt >= 3 || (err.status !== 429 && err.status < 500 && err.status !== 0)) throw err
      const backoff = err.retryAfter ? err.retryAfter * 1000 : 800 * 2 ** attempt
      attempt++
      await sleep(backoff)
    }
  }
}

// ───────── Tipi grezzi ─────────
export interface OF1Meeting {
  meeting_key: number
  meeting_name: string
  meeting_official_name?: string
  location: string
  country_name: string
  country_code: string
  circuit_short_name: string
  circuit_key?: number
  date_start: string
  year: number
  gmt_offset?: string
}
export interface OF1Session {
  session_key: number
  session_name: string
  session_type: string
  meeting_key: number
  location: string
  country_name: string
  country_code: string
  circuit_short_name: string
  date_start: string
  date_end: string
  year: number
  gmt_offset?: string
}
export interface OF1Driver {
  driver_number: number
  broadcast_name: string
  full_name: string
  name_acronym: string
  first_name?: string
  last_name?: string
  team_name: string
  team_colour?: string
  country_code?: string
  headshot_url?: string
  session_key: number
}
export interface OF1Position { date: string; driver_number: number; position: number }
export interface OF1Interval { date: string; driver_number: number; gap_to_leader: number | string | null; interval: number | string | null }
export interface OF1Lap {
  driver_number: number
  lap_number: number
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  i1_speed?: number | null
  i2_speed?: number | null
  st_speed?: number | null
  is_pit_out_lap: boolean
  date_start: string | null
}
export interface OF1Stint {
  driver_number: number
  stint_number: number
  lap_start: number
  lap_end: number
  compound: string | null
  tyre_age_at_start: number | null
}
export interface OF1Pit { date: string; driver_number: number; lap_number: number; pit_duration: number | null; lane_duration?: number | null; stop_duration?: number | null }
export interface OF1Weather {
  date: string
  air_temperature: number
  track_temperature: number
  humidity: number
  pressure: number
  rainfall: number
  wind_direction: number
  wind_speed: number
}
export interface OF1RaceControl {
  date: string
  category: string
  flag: string | null
  message: string
  scope: string | null
  sector: number | null
  driver_number: number | null
  lap_number: number | null
}
export interface OF1TeamRadio { date: string; driver_number: number; recording_url: string }
export interface OF1Location { date: string; driver_number: number; x: number; y: number; z: number }
export interface OF1SessionResult {
  driver_number: number
  position: number | null
  number_of_laps?: number
  dnf?: boolean
  dns?: boolean
  dsq?: boolean
  duration?: number | number[] | null
  gap_to_leader?: number | string | (number | string | null)[] | null
  points?: number
}
export interface OF1StartingGrid { driver_number: number; position: number; lap_duration?: number | null }
export interface OF1CarData { date: string; driver_number: number; speed: number; rpm: number; n_gear: number; throttle: number; brake: number; drs: number }
export interface OF1Overtake { date: string; overtaking_driver_number: number; overtaken_driver_number: number; position: number }

const LONG: FetchOptions = { ttl: 30 * DAY }

// ───────── Endpoint ─────────
export const openf1 = {
  meetings: (year: number, o?: FetchOptions) =>
    year < OPENF1_FIRST_YEAR ? Promise.resolve([] as OF1Meeting[]) : of1<OF1Meeting>('meetings', { year }, { ttl: 6 * 3600_000, ...o }),
  sessions: (p: Params, o?: FetchOptions) => of1<OF1Session>('sessions', p, { ttl: 6 * 3600_000, ...o }),
  drivers: (session_key: number, o?: FetchOptions) => of1<OF1Driver>('drivers', { session_key }, { ...LONG, ...o }),
  position: (p: Params, o?: FetchOptions) => of1<OF1Position>('position', p, o),
  intervals: (p: Params, o?: FetchOptions) => of1<OF1Interval>('intervals', p, o),
  laps: (p: Params, o?: FetchOptions) => of1<OF1Lap>('laps', p, o),
  stints: (p: Params, o?: FetchOptions) => of1<OF1Stint>('stints', p, o),
  pit: (p: Params, o?: FetchOptions) => of1<OF1Pit>('pit', p, o),
  weather: (p: Params, o?: FetchOptions) => of1<OF1Weather>('weather', p, o),
  raceControl: (p: Params, o?: FetchOptions) => of1<OF1RaceControl>('race_control', p, o),
  teamRadio: (p: Params, o?: FetchOptions) => of1<OF1TeamRadio>('team_radio', p, o),
  location: (p: Params, o?: FetchOptions) => of1<OF1Location>('location', p, { memoryOnly: true, ...o }),
  sessionResult: (p: Params, o?: FetchOptions) => of1<OF1SessionResult>('session_result', p, o),
  /** ATTENZIONE: richiede la session_key della QUALIFICA */
  startingGrid: (qualiSessionKey: number, o?: FetchOptions) => of1<OF1StartingGrid>('starting_grid', { session_key: qualiSessionKey }, o),
  /** ~3,2 Hz, solo live + breve buffer: sulle sessioni storiche restituisce [] */
  carData: (p: Params, o?: FetchOptions) => of1<OF1CarData>('car_data', p, { memoryOnly: true, ...o }),
  overtakes: (p: Params, o?: FetchOptions) => of1<OF1Overtake>('overtakes', p, o),
}

/** Abbina un GP Jolpica al meeting OpenF1 (stesso anno, data gara entro il weekend). */
export async function findMeeting(season: number, raceDateISO: string, signal?: AbortSignal): Promise<OF1Meeting | null> {
  if (season < OPENF1_FIRST_YEAR) return null
  const meetings = await openf1.meetings(season, { signal })
  const race = new Date(raceDateISO).getTime()
  let best: OF1Meeting | null = null
  let bestDiff = Infinity
  for (const m of meetings) {
    const diff = race - new Date(m.date_start).getTime()
    // il meeting inizia da 0 a 5 giorni prima della gara (esclusi i test pre-stagionali)
    if (diff >= -86_400_000 && diff <= 5 * 86_400_000 && diff < bestDiff && !/test/i.test(m.meeting_name)) {
      best = m
      bestDiff = diff
    }
  }
  return best
}

/** Sessioni OpenF1 di un GP Jolpica. */
export async function sessionsForRace(season: number, raceDateISO: string, signal?: AbortSignal): Promise<OF1Session[]> {
  const m = await findMeeting(season, raceDateISO, signal)
  if (!m) return []
  return openf1.sessions({ meeting_key: m.meeting_key }, { signal })
}
