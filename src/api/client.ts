// fetchJSON con cache a due livelli: memoria (max 600 voci, LRU) + localStorage (prefisso f1hub:cache:).
// TTL di default 10 minuti, configurabile per richiesta. Supporta AbortSignal.

export class ApiError extends Error {
  status: number
  url: string
  retryAfter?: number
  constructor(message: string, status: number, url: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
    this.retryAfter = retryAfter
  }
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const DEFAULT_TTL = 10 * MINUTE

const LS_PREFIX = 'f1hub:cache:'
const MEM_MAX = 600

interface Entry {
  t: number // timestamp di scrittura
  ttl: number
  v: unknown
}

const mem = new Map<string, Entry>()

function memGet(key: string): Entry | undefined {
  const e = mem.get(key)
  if (e) {
    mem.delete(key)
    mem.set(key, e) // LRU: sposta in coda
  }
  return e
}

function memSet(key: string, e: Entry) {
  mem.set(key, e)
  while (mem.size > MEM_MAX) {
    const first = mem.keys().next().value
    if (first === undefined) break
    mem.delete(first)
  }
}

function lsGet(key: string): Entry | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    return raw ? (JSON.parse(raw) as Entry) : undefined
  } catch {
    return undefined
  }
}

function lsSet(key: string, e: Entry) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(e))
  } catch {
    // quota piena: elimina le voci di cache più vecchie e riprova una volta
    pruneLocalCache(0.5)
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(e))
    } catch {
      /* rinuncia: resta la cache in memoria */
    }
  }
}

/** Elimina una frazione delle voci di cache più vecchie da localStorage. */
export function pruneLocalCache(fraction = 1) {
  try {
    const items: [string, number][] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(LS_PREFIX)) continue
      let t = 0
      try {
        t = (JSON.parse(localStorage.getItem(k) || '{}') as Entry).t || 0
      } catch {
        /* voce corrotta */
      }
      items.push([k, t])
    }
    items.sort((a, b) => a[1] - b[1])
    items.slice(0, Math.ceil(items.length * fraction)).forEach(([k]) => localStorage.removeItem(k))
  } catch {
    /* localStorage non disponibile */
  }
}

/** Svuota tutta la cache dati (memoria + localStorage). */
export function clearCache() {
  mem.clear()
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith(LS_PREFIX) || k.startsWith('f1hub:photos:'))) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignora */
  }
}

export interface FetchOptions {
  ttl?: number
  signal?: AbortSignal
  /** non scrive su localStorage (es. live timing ad alta frequenza) */
  memoryOnly?: boolean
  /** ignora la cache fresca e forza una richiesta di rete */
  force?: boolean
  /** status HTTP da trattare come "insieme vuoto" invece che errore */
  emptyOn?: number[]
  emptyValue?: unknown
}

const inflight = new Map<string, Promise<unknown>>()

function isFresh(e: Entry | undefined): e is Entry {
  return !!e && Date.now() - e.t < e.ttl
}

/** C'è un valore fresco in cache per questo URL? */
export function hasFresh(url: string): boolean {
  return isFresh(memGet(url)) || isFresh(lsGet(url))
}

/** Restituisce l'ultimo valore in cache anche se scaduto (per fallback offline). */
export function peekCache<T>(url: string): T | undefined {
  return (memGet(url) ?? lsGet(url))?.v as T | undefined
}

export async function fetchJSON<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const ttl = opts.ttl ?? DEFAULT_TTL
  if (!opts.force) {
    const m = memGet(url)
    if (isFresh(m)) return m.v as T
    if (!opts.memoryOnly) {
      const l = lsGet(url)
      if (isFresh(l)) {
        memSet(url, l)
        return l.v as T
      }
    }
  }

  const existing = inflight.get(url)
  if (existing) return existing as Promise<T>

  const p = (async () => {
    let res: Response
    try {
      res = await fetch(url, { signal: opts.signal, headers: { Accept: 'application/json' } })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      const stale = peekCache<T>(url)
      if (stale !== undefined) return stale // rete giù: usa la cache scaduta (dati veri, solo meno recenti)
      throw new ApiError('Rete non raggiungibile', 0, url)
    }
    if (!res.ok) {
      if (opts.emptyOn?.includes(res.status)) {
        const v = (opts.emptyValue ?? []) as T
        memSet(url, { t: Date.now(), ttl, v })
        return v
      }
      const ra = Number(res.headers.get('Retry-After'))
      const stale = res.status >= 500 ? peekCache<T>(url) : undefined
      if (stale !== undefined) return stale
      throw new ApiError(`HTTP ${res.status}`, res.status, url, Number.isFinite(ra) && ra > 0 ? ra : undefined)
    }
    const v = (await res.json()) as T
    const e: Entry = { t: Date.now(), ttl, v }
    memSet(url, e)
    if (!opts.memoryOnly) lsSet(url, e)
    return v
  })()

  inflight.set(url, p)
  try {
    return await p
  } finally {
    inflight.delete(url)
  }
}
