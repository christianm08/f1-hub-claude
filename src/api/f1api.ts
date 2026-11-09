// f1api.dev — fonte SECONDARIA, usata solo per arricchire le schede piloti/team
// (sigla, data di nascita, numero di gara, sede team, prima stagione, titoli vinti).
// In caso di conflitto con Jolpica vince Jolpica (vedi model.ts).

import { fetchJSON, DAY } from './client'

const BASE = 'https://f1api.dev/api'

export interface F1ApiDriver {
  driverId?: string
  name?: string
  surname?: string
  nationality?: string
  birthday?: string
  number?: number | string | null
  shortName?: string | null
  url?: string
  teamId?: string
}
export interface F1ApiTeam {
  teamId?: string
  teamName?: string
  teamNationality?: string
  country?: string
  base?: string
  firstAppeareance?: number | null
  firstAppearance?: number | null
  constructorsChampionships?: number | null
  driversChampionships?: number | null
  url?: string
}

function arr<T>(v: unknown, key: string): T[] {
  if (Array.isArray(v)) return v as T[]
  const o = v as Record<string, unknown> | null
  return Array.isArray(o?.[key]) ? (o![key] as T[]) : []
}

export const f1api = {
  async drivers(season: number | string): Promise<F1ApiDriver[]> {
    try {
      return arr<F1ApiDriver>(await fetchJSON(`${BASE}/${season}/drivers?limit=100`, { ttl: 3 * DAY }), 'drivers')
    } catch {
      return [] // fonte secondaria: se non risponde, nessun arricchimento (mai dati inventati)
    }
  },
  async teams(season: number | string): Promise<F1ApiTeam[]> {
    try {
      return arr<F1ApiTeam>(await fetchJSON(`${BASE}/${season}/teams?limit=100`, { ttl: 3 * DAY }), 'teams')
    } catch {
      return []
    }
  },
}

/** Normalizza un nome per l'abbinamento tra fonti (accenti, maiuscole, trattini). */
export function normName(s?: string | null) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}
