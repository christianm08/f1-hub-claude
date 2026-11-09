// Anagrafiche circuiti: unisce i dati Jolpica (località, paese, coordinate) con il dataset MIT
// dei tracciati (lunghezza dichiarata, anno di apertura). Curve e record sul giro non sono
// forniti da nessuna fonte usata → n/d.

import type { Circuit } from '../api/jolpica'
import { countryInfo } from './meta'
import { TRACKS } from './tracks'

export interface CircuitInfo {
  circuit: Circuit
  iso2: string
  code: string
  continent: ReturnType<typeof countryInfo>['continent']
  lengthM: number | null
  opened: number | null
  hasTrack: boolean
}

export function circuitInfo(c: Circuit): CircuitInfo {
  const ci = countryInfo(c.Location.country)
  const tr = TRACKS[c.circuitId]
  return { circuit: c, iso2: ci.iso2, code: ci.code, continent: ci.continent, lengthM: tr?.lengthM ?? null, opened: tr?.opened ?? null, hasTrack: !!tr }
}

export function fmtLength(m: number | null, units: 'metric' | 'imperial', locale: string): string | null {
  if (m == null) return null
  const v = units === 'metric' ? m / 1000 : m / 1609.344
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(v)} ${units === 'metric' ? 'km' : 'mi'}`
}
