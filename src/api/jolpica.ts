// Jolpica F1 API (compatibile Ergast) — fonte primaria per tutti i dati storici/statici.
// https://api.jolpi.ca/ergast/f1/  — nessuna API key. Orari restituiti in UTC.

import { ApiError, fetchJSON, hasFresh, DAY, HOUR, MINUTE, type FetchOptions } from './client'

const BASE = 'https://api.jolpi.ca/ergast/f1'

// ───────── Tipi ─────────
export interface Location { lat: string; long: string; locality: string; country: string }
export interface Circuit { circuitId: string; url: string; circuitName: string; Location: Location }
export interface SessionTime { date: string; time?: string }
export interface Race {
  season: string
  round: string
  url: string
  raceName: string
  Circuit: Circuit
  date: string
  time?: string
  FirstPractice?: SessionTime
  SecondPractice?: SessionTime
  ThirdPractice?: SessionTime
  Qualifying?: SessionTime
  Sprint?: SessionTime
  SprintQualifying?: SessionTime
  SprintShootout?: SessionTime
  Results?: RaceResult[]
  QualifyingResults?: QualifyingResult[]
  SprintResults?: RaceResult[]
  PitStops?: PitStop[]
}
export interface Driver {
  driverId: string
  permanentNumber?: string
  code?: string
  url: string
  givenName: string
  familyName: string
  dateOfBirth?: string
  nationality: string
}
export interface Constructor { constructorId: string; url: string; name: string; nationality: string }
export interface RaceResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: Driver
  Constructor: Constructor
  grid?: string
  laps: string
  status: string
  Time?: { millis?: string; time: string }
  FastestLap?: { rank?: string; lap: string; Time?: { time: string }; AverageSpeed?: { units: string; speed: string } }
}
export interface QualifyingResult {
  number: string
  position: string
  Driver: Driver
  Constructor: Constructor
  Q1?: string
  Q2?: string
  Q3?: string
}
export interface PitStop { driverId: string; lap: string; stop: string; time: string; duration: string }
export interface DriverStanding {
  position?: string
  positionText: string
  points: string
  wins: string
  Driver: Driver
  Constructors: Constructor[]
}
export interface ConstructorStanding {
  position?: string
  positionText: string
  points: string
  wins: string
  Constructor: Constructor
}
export interface Season { season: string; url: string }

interface MRData<T> { MRData: T & { limit: string; offset: string; total: string } }

const STATIC = { ttl: 7 * DAY }
const SEMI = { ttl: 30 * MINUTE }

function isPastSeason(season: string | number) {
  return Number(season) < new Date().getUTCFullYear()
}
/** stagioni concluse: cache lunga; stagione corrente: cache breve */
function ttlFor(season: string | number): FetchOptions {
  return isPastSeason(season) ? { ttl: 3 * DAY } : SEMI
}

// Jolpica: limite di burst ~4 req/s. Le richieste servite dalla cache non passano dal throttle
// (fetchJSON risponde subito), quelle di rete vengono distanziate.
let lastSlots: number[] = []
async function throttle() {
  for (;;) {
    const now = Date.now()
    lastSlots = lastSlots.filter((t) => now - t < 1000)
    if (lastSlots.length < 4) {
      lastSlots.push(now)
      return
    }
    await new Promise((r) => setTimeout(r, 1000 - (now - lastSlots[0]) + 10))
  }
}

async function jfetch<T>(url: string, opts?: FetchOptions): Promise<T> {
  if (!hasFresh(url)) await throttle() // solo le richieste di rete consumano budget
  try {
    return await fetchJSON<T>(url, opts)
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 429) throw e
    await new Promise((r) => setTimeout(r, (e.retryAfter ?? 2) * 1000))
    await throttle()
    return fetchJSON<T>(url, opts)
  }
}

async function get<T>(path: string, opts?: FetchOptions): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  return (await jfetch<MRData<T>>(`${BASE}/${path}${sep}limit=100`, opts)).MRData
}

/** Scarica tutte le pagine di un endpoint paginato (limit 100). */
async function getAll<T, K extends keyof T>(path: string, pick: (d: T) => unknown[], opts?: FetchOptions): Promise<T[K]> {
  const first = await jfetch<MRData<T>>(`${BASE}/${path}?limit=100&offset=0`, opts)
  const total = Number(first.MRData.total)
  const pages = [first.MRData]
  for (let off = 100; off < total; off += 100) {
    pages.push((await jfetch<MRData<T>>(`${BASE}/${path}?limit=100&offset=${off}`, opts)).MRData)
  }
  return pages.flatMap((p) => pick(p)) as T[K]
}

type RaceTable = { RaceTable: { Races: Race[] } }

/** Unisce le gare paginate per round (le righe di una stessa gara possono stare su pagine diverse). */
function mergeRaces(races: Race[], key: 'Results' | 'SprintResults' | 'QualifyingResults'): Race[] {
  const byRound = new Map<string, Race>()
  for (const r of races) {
    const ex = byRound.get(r.round)
    if (!ex) byRound.set(r.round, { ...r, [key]: [...((r[key] as unknown[]) ?? [])] })
    else (ex[key] as unknown[]).push(...((r[key] as unknown[]) ?? []))
  }
  return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round))
}

// ───────── Metodi ─────────
export const jolpica = {
  async seasons(): Promise<number[]> {
    const all = await getAll<{ SeasonTable: { Seasons: Season[] } }, 'SeasonTable'>('seasons.json', (d) => d.SeasonTable.Seasons, STATIC)
    return (all as unknown as Season[]).map((s) => Number(s.season))
  },

  async schedule(season: string | number): Promise<Race[]> {
    return (await get<RaceTable>(`${season}.json`, ttlFor(season))).RaceTable.Races
  },

  async driverStandings(season: string | number, round?: string | number): Promise<DriverStanding[]> {
    const p = round ? `${season}/${round}/driverstandings.json` : `${season}/driverstandings.json`
    const d = await get<{ StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } }>(p, ttlFor(season))
    return d.StandingsTable.StandingsLists[0]?.DriverStandings ?? []
  },

  async constructorStandings(season: string | number, round?: string | number): Promise<ConstructorStanding[]> {
    const p = round ? `${season}/${round}/constructorstandings.json` : `${season}/constructorstandings.json`
    const d = await get<{ StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] } }>(p, ttlFor(season))
    return d.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []
  },

  async drivers(season: string | number): Promise<Driver[]> {
    return (await get<{ DriverTable: { Drivers: Driver[] } }>(`${season}/drivers.json`, ttlFor(season))).DriverTable.Drivers
  },

  async driver(driverId: string): Promise<Driver | undefined> {
    return (await get<{ DriverTable: { Drivers: Driver[] } }>(`drivers/${driverId}.json`, STATIC)).DriverTable.Drivers[0]
  },

  async constructors(season: string | number): Promise<Constructor[]> {
    return (await get<{ ConstructorTable: { Constructors: Constructor[] } }>(`${season}/constructors.json`, ttlFor(season))).ConstructorTable.Constructors
  },

  async constructorInfo(constructorId: string): Promise<Constructor | undefined> {
    return (await get<{ ConstructorTable: { Constructors: Constructor[] } }>(`constructors/${constructorId}.json`, STATIC)).ConstructorTable.Constructors[0]
  },

  /** risultati gara di un pilota in una stagione (una riga per GP) */
  async driverResults(season: string | number, driverId: string): Promise<Race[]> {
    return (await get<RaceTable>(`${season}/drivers/${driverId}/results.json`, ttlFor(season))).RaceTable.Races
  },

  async driverQualifying(season: string | number, driverId: string): Promise<Race[]> {
    return (await get<RaceTable>(`${season}/drivers/${driverId}/qualifying.json`, ttlFor(season))).RaceTable.Races
  },

  async driverSprint(season: string | number, driverId: string): Promise<Race[]> {
    return (await get<RaceTable>(`${season}/drivers/${driverId}/sprint.json`, ttlFor(season))).RaceTable.Races
  },

  async constructorResults(season: string | number, constructorId: string): Promise<Race[]> {
    const races = await getAll<RaceTable, 'RaceTable'>(`${season}/constructors/${constructorId}/results.json`, (d) => d.RaceTable.Races, ttlFor(season))
    return mergeRaces(races as unknown as Race[], 'Results')
  },

  async constructorSprint(season: string | number, constructorId: string): Promise<Race[]> {
    const races = await getAll<RaceTable, 'RaceTable'>(`${season}/constructors/${constructorId}/sprint.json`, (d) => d.RaceTable.Races, ttlFor(season))
    return mergeRaces(races as unknown as Race[], 'SprintResults')
  },

  /** tutti i risultati di gara di una stagione (paginati) */
  async seasonResults(season: string | number): Promise<Race[]> {
    const races = await getAll<RaceTable, 'RaceTable'>(`${season}/results.json`, (d) => d.RaceTable.Races, ttlFor(season))
    return mergeRaces(races as unknown as Race[], 'Results')
  },

  /** tutti i risultati sprint di una stagione (paginati) */
  async seasonSprint(season: string | number): Promise<Race[]> {
    const races = await getAll<RaceTable, 'RaceTable'>(`${season}/sprint.json`, (d) => d.RaceTable.Races, ttlFor(season))
    return mergeRaces(races as unknown as Race[], 'SprintResults')
  },

  /** vincitori di ogni GP della stagione (solo P1: una richiesta) */
  async seasonWinners(season: string | number): Promise<Race[]> {
    return (await get<RaceTable>(`${season}/results/1.json`, ttlFor(season))).RaceTable.Races
  },

  async raceResults(season: string | number, round: string | number): Promise<Race | undefined> {
    return (await get<RaceTable>(`${season}/${round}/results.json`, ttlFor(season))).RaceTable.Races[0]
  },

  async qualifying(season: string | number, round: string | number): Promise<Race | undefined> {
    return (await get<RaceTable>(`${season}/${round}/qualifying.json`, ttlFor(season))).RaceTable.Races[0]
  },

  async sprint(season: string | number, round: string | number): Promise<Race | undefined> {
    return (await get<RaceTable>(`${season}/${round}/sprint.json`, ttlFor(season))).RaceTable.Races[0]
  },

  async pitstops(season: string | number, round: string | number): Promise<PitStop[]> {
    return (await get<RaceTable>(`${season}/${round}/pitstops.json`, ttlFor(season))).RaceTable.Races[0]?.PitStops ?? []
  },

  async circuits(season?: string | number): Promise<Circuit[]> {
    const p = season ? `${season}/circuits.json` : 'circuits.json'
    if (season) return (await get<{ CircuitTable: { Circuits: Circuit[] } }>(p, STATIC)).CircuitTable.Circuits
    const all = await getAll<{ CircuitTable: { Circuits: Circuit[] } }, 'CircuitTable'>(p, (d) => d.CircuitTable.Circuits, STATIC)
    return all as unknown as Circuit[]
  },

  /** ultimi vincitori su un circuito (una sola richiesta: nessun circuito supera 100 GP) */
  async circuitWinners(circuitId: string): Promise<Race[]> {
    const d = await jfetch<MRData<RaceTable>>(`${BASE}/circuits/${circuitId}/results/1.json?limit=100`, { ttl: 12 * HOUR })
    return d.MRData.RaceTable.Races.slice(-5)
  },
}

// ───────── Helper ─────────
export type SessionKind = 'fp1' | 'fp2' | 'fp3' | 'sprintQuali' | 'sprint' | 'quali' | 'race'
export interface WeekendSession { kind: SessionKind; start: Date }

/** Data/ora della sessione (UTC dall'API → Date; la formattazione usa il locale del browser) */
export function sessionDateTime(s?: SessionTime): Date | null {
  if (!s?.date) return null
  return new Date(`${s.date}T${s.time ?? '00:00:00Z'}`)
}

/** durata indicativa usata solo per lo stato "in corso" (nessun dato mostrato come reale) */
const DURATION_MIN: Record<SessionKind, number> = { fp1: 60, fp2: 60, fp3: 60, sprintQuali: 45, sprint: 60, quali: 60, race: 120 }
export function sessionDurationMs(kind: SessionKind) {
  return DURATION_MIN[kind] * MINUTE
}

export function raceSessions(r: Race): WeekendSession[] {
  const list: [SessionKind, SessionTime | undefined][] = [
    ['fp1', r.FirstPractice],
    ['fp2', r.SecondPractice],
    ['fp3', r.ThirdPractice],
    ['sprintQuali', r.SprintQualifying ?? r.SprintShootout],
    ['sprint', r.Sprint],
    ['quali', r.Qualifying],
    ['race', { date: r.date, time: r.time }],
  ]
  return list
    .map(([kind, s]) => ({ kind, start: sessionDateTime(s) }))
    .filter((s): s is WeekendSession => !!s.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export type RaceStatus = 'past' | 'upcoming' | 'live'

export function raceStatus(r: Race, now = new Date()): RaceStatus {
  const sessions = raceSessions(r)
  const first = sessions[0]?.start
  const raceStart = sessionDateTime({ date: r.date, time: r.time })
  if (!raceStart) return 'upcoming'
  const end = raceStart.getTime() + sessionDurationMs('race')
  if (now.getTime() > end) return 'past'
  if (first && now.getTime() >= first.getTime()) return 'live'
  return 'upcoming'
}

/** prossima sessione (o quella in corso) del calendario */
export function nextSession(races: Race[], now = new Date()): { race: Race; session: WeekendSession; live: boolean } | null {
  for (const race of races) {
    for (const s of raceSessions(race)) {
      const end = s.start.getTime() + sessionDurationMs(s.kind)
      if (now.getTime() < end) return { race, session: s, live: now.getTime() >= s.start.getTime() }
    }
  }
  return null
}

export function driverName(d?: Driver) {
  return d ? `${d.givenName} ${d.familyName}` : 'n/d'
}

/** Il risultato è un DNF/DNS/DSQ? Basato su positionText/status reali dell'API. */
export function resultFlag(r: RaceResult): 'DSQ' | 'DNS' | 'DNF' | null {
  const pt = r.positionText
  if (pt === 'D' || /disqualified/i.test(r.status)) return 'DSQ'
  if (pt === 'W' || /did not start|withdrew/i.test(r.status)) return 'DNS'
  if (pt === 'R' || pt === 'N' || pt === 'F' || pt === 'E') return 'DNF'
  return null
}

export function isFinished(r: RaceResult) {
  return /^\d+$/.test(r.positionText) && (r.status === 'Finished' || /^\+\d+ Laps?$/.test(r.status) || r.status === 'Lapped')
}

export interface ProgressionSeries { id: string; name: string; color?: string; values: number[] }

/**
 * Punti cumulati gara dopo gara, calcolati dai risultati reali (gare + sprint) di Jolpica.
 * Restituisce le etichette dei round e una serie per pilota/team. Nessun dato stimato.
 */
export function pointsProgression(races: Race[], sprints: Race[], kind: 'driver' | 'team') {
  const rounds = races.map((r) => r.round)
  const totals = new Map<string, { name: string; values: number[]; acc: number }>()
  const sprintBy = new Map(sprints.map((s) => [s.round, s.SprintResults ?? []]))
  rounds.forEach((round, i) => {
    const race = races[i]
    const rows = [...(race.Results ?? []), ...(sprintBy.get(round) ?? [])]
    const gained = new Map<string, number>()
    for (const r of rows) {
      const id = kind === 'driver' ? r.Driver.driverId : r.Constructor.constructorId
      const name = kind === 'driver' ? `${r.Driver.givenName} ${r.Driver.familyName}` : r.Constructor.name
      if (!totals.has(id)) totals.set(id, { name, values: Array(i).fill(0), acc: 0 })
      gained.set(id, (gained.get(id) ?? 0) + Number(r.points))
    }
    for (const [id, t] of totals) {
      t.acc += gained.get(id) ?? 0
      t.values.push(t.acc)
    }
  })
  const labels = races.map((r) => r.Circuit.Location.country.slice(0, 3).toUpperCase())
  const series = [...totals.entries()].map(([id, t]) => ({ id, name: t.name, values: t.values }))
  return { labels, series }
}
