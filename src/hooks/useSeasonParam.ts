// Stagione corrente della pagina: ?season= nell'URL (condivisibile), altrimenti la stagione predefinita.

import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../store/settings'

export const FIRST_SEASON = 2014 // era ibrida

export function useSeasonParam(): [number, (s: number) => void] {
  const [params, setParams] = useSearchParams()
  const { season: def } = useSettings()
  const raw = Number(params.get('season'))
  const season = Number.isInteger(raw) && raw >= FIRST_SEASON && raw <= new Date().getFullYear() + 1 ? raw : def
  const setSeason = useCallback(
    (s: number) =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.set('season', String(s))
          return n
        },
        { replace: true },
      ),
    [setParams],
  )
  return [season, setSeason]
}
