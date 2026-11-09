// Regole di risoluzione dei conflitti tra fonti.
// Jolpica è la fonte primaria designata: i suoi campi vincono sempre.
// f1api.dev riempie SOLO i campi che Jolpica non fornisce (o lascia vuoti).

import type { Constructor, Driver } from './jolpica'
import { f1api, normName, type F1ApiDriver, type F1ApiTeam } from './f1api'

export type Source = 'jolpica' | 'f1api'
export interface Sourced<T> { value: T | null; source: Source | null }

const pick = <T,>(primary: T | null | undefined, secondary: T | null | undefined): Sourced<T> =>
  primary !== undefined && primary !== null && primary !== ('' as unknown as T)
    ? { value: primary, source: 'jolpica' }
    : secondary !== undefined && secondary !== null && secondary !== ('' as unknown as T)
      ? { value: secondary, source: 'f1api' }
      : { value: null, source: null }

export interface DriverProfile {
  driver: Driver
  code: Sourced<string>
  number: Sourced<string>
  dateOfBirth: Sourced<string>
}

export function matchF1ApiDriver(d: Driver, list: F1ApiDriver[]): F1ApiDriver | undefined {
  return (
    list.find((x) => x.driverId && normName(x.driverId) === normName(d.driverId)) ??
    list.find((x) => normName(x.surname) === normName(d.familyName) && normName(x.name) === normName(d.givenName)) ??
    list.find((x) => normName(x.surname) === normName(d.familyName))
  )
}

export function mergeDriver(d: Driver, extra?: F1ApiDriver): DriverProfile {
  return {
    driver: d,
    code: pick(d.code, extra?.shortName ?? undefined),
    number: pick(d.permanentNumber, extra?.number != null ? String(extra.number) : undefined),
    dateOfBirth: pick(d.dateOfBirth, extra?.birthday),
  }
}

export interface TeamProfile {
  constructor: Constructor
  base: Sourced<string>
  firstSeason: Sourced<number>
  constructorsTitles: Sourced<number>
  driversTitles: Sourced<number>
}

export function matchF1ApiTeam(c: Constructor, list: F1ApiTeam[]): F1ApiTeam | undefined {
  const n = normName(c.name)
  return (
    list.find((x) => x.teamId && normName(x.teamId) === normName(c.constructorId)) ??
    list.find((x) => normName(x.teamName).includes(n) || n.includes(normName(x.teamName)))
  )
}

export function mergeTeam(c: Constructor, extra?: F1ApiTeam): TeamProfile {
  // Jolpica non fornisce sede, prima stagione e titoli: questi campi vengono solo da f1api.dev
  return {
    constructor: c,
    base: pick<string>(undefined, extra?.base ?? undefined),
    firstSeason: pick<number>(undefined, extra?.firstAppeareance ?? extra?.firstAppearance ?? undefined),
    constructorsTitles: pick<number>(undefined, extra?.constructorsChampionships ?? undefined),
    driversTitles: pick<number>(undefined, extra?.driversChampionships ?? undefined),
  }
}

export async function driverProfile(d: Driver, season: number): Promise<DriverProfile> {
  const list = await f1api.drivers(season)
  return mergeDriver(d, matchF1ApiDriver(d, list))
}

export async function teamProfile(c: Constructor, season: number): Promise<TeamProfile> {
  const list = await f1api.teams(season)
  return mergeTeam(c, matchF1ApiTeam(c, list))
}
