// Impostazioni globali (Context + hook useSettings), persistite in localStorage con prefisso f1hub:.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DICT, type DictKey, type Lang } from '../i18n/dict'

export type Theme = 'dark' | 'light'
export type Units = 'metric' | 'imperial'
export type FavKind = 'driver' | 'team' | 'circuit'
export interface Favorite { kind: FavKind; id: string; name: string; season: number }
export type NotifKey = 'notif_quali' | 'notif_race' | 'notif_results' | 'notif_news' | 'notif_driver' | 'notif_team'
export const NOTIF_KEYS: NotifKey[] = ['notif_quali', 'notif_race', 'notif_results', 'notif_news', 'notif_driver', 'notif_team']

export interface Settings {
  theme: Theme
  lang: Lang
  season: number
  units: Units
  favorites: Favorite[]
  favDriverId: string | null
  favTeamId: string | null
  autoRefresh: boolean
  notifPrefs: Record<NotifKey, boolean>
}

const PREFIX = 'f1hub:'
const CURRENT_YEAR = new Date().getFullYear()

const DEFAULTS: Settings = {
  theme: 'dark',
  lang: 'it',
  season: CURRENT_YEAR,
  units: 'metric',
  favorites: [],
  favDriverId: null,
  favTeamId: null,
  autoRefresh: true,
  notifPrefs: { notif_quali: false, notif_race: false, notif_results: false, notif_news: false, notif_driver: false, notif_team: false },
}

function read<K extends keyof Settings>(key: K): Settings[K] {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return DEFAULTS[key]
    const v = JSON.parse(raw) as Settings[K]
    if (key === 'notifPrefs') return { ...DEFAULTS.notifPrefs, ...(v as object) } as Settings[K]
    return v
  } catch {
    return DEFAULTS[key]
  }
}

function write<K extends keyof Settings>(key: K, v: Settings[K]) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(v))
  } catch {
    /* storage non disponibile */
  }
}

interface Ctx extends Settings {
  set: <K extends keyof Settings>(key: K, v: Settings[K]) => void
  toggleFavorite: (f: Favorite) => void
  isFavorite: (kind: FavKind, id: string) => boolean
  t: (key: DictKey, vars?: Record<string, string | number>) => string
  locale: string
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(() => {
    const out = {} as Settings
    ;(Object.keys(DEFAULTS) as (keyof Settings)[]).forEach((k) => {
      ;(out as unknown as Record<string, unknown>)[k] = read(k)
    })
    return out
  })

  const set = useCallback(<K extends keyof Settings>(key: K, v: Settings[K]) => {
    write(key, v)
    setS((prev) => ({ ...prev, [key]: v }))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = s.theme
    root.lang = s.lang
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.theme === 'dark' ? '#0a0e14' : '#f4f6fa')
  }, [s.theme, s.lang])

  const toggleFavorite = useCallback((f: Favorite) => {
    setS((prev) => {
      const exists = prev.favorites.some((x) => x.kind === f.kind && x.id === f.id)
      const favorites = exists ? prev.favorites.filter((x) => !(x.kind === f.kind && x.id === f.id)) : [...prev.favorites, f]
      write('favorites', favorites)
      return { ...prev, favorites }
    })
  }, [])

  const isFavorite = useCallback((kind: FavKind, id: string) => s.favorites.some((x) => x.kind === kind && x.id === id), [s.favorites])

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      let str = DICT[s.lang][key] ?? DICT.it[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v))
      return str
    },
    [s.lang],
  )

  const value = useMemo<Ctx>(
    () => ({ ...s, set, toggleFavorite, isFavorite, t, locale: s.lang === 'it' ? 'it-IT' : 'en-GB' }),
    [s, set, toggleFavorite, isFavorite, t],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const c = useContext(SettingsContext)
  if (!c) throw new Error('useSettings deve essere usato dentro SettingsProvider')
  return c
}
