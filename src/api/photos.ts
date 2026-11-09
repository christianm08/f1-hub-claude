// Risoluzione immagini (foto piloti e loghi team) con verifica automatica della licenza file per file.
//
//  1. mappa curata in data/assets.ts (licenza verificata a mano)
//  2. candidato deterministico dall'articolo Wikipedia fornito da Jolpica:
//       - ritratti: immagine infobox (REST /page/summary), poi Wikidata P18
//       - loghi:    Wikidata P154 (logo), poi immagine infobox se SVG/PNG
//     Si accettano solo file ospitati su Wikimedia Commons.
//  3. VERIFICA: per ogni candidato si interrogano le API di Commons (extmetadata) e il file viene
//     usato solo se la licenza è CC BY / CC BY-SA / CC0 / pubblico dominio (o PD-textlogo).
//     Autore e licenza vengono mostrati come attribuzione.
//  4. altrimenti placeholder (gestito dai componenti)
// Mai foto di altri piloti, mai immagini casuali dal web. Cache locale 90 giorni.

import { DRIVER_PHOTOS, TEAM_LOGOS, commonsUrl } from '../data/assets'

const LS_KEY = 'f1hub:photos:v2'
const TTL = 90 * 24 * 3600_000
const ALLOWED = /^(?!.*\b(nc|nd)\b)(cc[ -]by(-sa)?\b|cc0|public domain|pd\b|pd-|attribution$)/i

export interface ResolvedImage {
  src: string
  tier: 1 | 2
  focal?: string
  /** attribuzione leggibile, es. "Mario Rossi · CC BY-SA 4.0 · Wikimedia Commons" */
  credit: string
  /** pagina del file su Commons */
  page?: string
}

type Store = Record<string, { t: number; v: ResolvedImage | null }>

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Store
  } catch {
    return {}
  }
}
function save(s: Store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch {
    /* ignora */
  }
}

const mem = new Map<string, Promise<ResolvedImage | null>>()

/** titolo dell'articolo dall'URL Wikipedia fornito da Jolpica */
export function wikiTitle(url?: string): { lang: string; title: string } | null {
  if (!url) return null
  const m = /^https?:\/\/([a-z]+)\.wikipedia\.org\/wiki\/(.+)$/.exec(url)
  if (!m) return null
  return { lang: m[1], title: decodeURIComponent(m[2]) }
}

/** nome file da un URL upload.wikimedia.org, solo se ospitato su Commons */
export function commonsFileFromUrl(src: string): string | null {
  const m = /\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(src)
  return m ? decodeURIComponent(m[1]) : null
}

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

async function summaryFile(w: { lang: string; title: string }): Promise<string | null> {
  const j = await getJSON<{ originalimage?: { source: string }; thumbnail?: { source: string } }>(
    `https://${w.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(w.title)}`,
  )
  const src = j?.originalimage?.source ?? j?.thumbnail?.source
  return src ? commonsFileFromUrl(src) : null
}

async function wikidataFile(w: { lang: string; title: string }, prop: 'P18' | 'P154'): Promise<string | null> {
  type WD = { entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: string } }; rank?: string }[]> }> }
  const j = await getJSON<WD>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=${w.lang}wiki&titles=${encodeURIComponent(w.title)}&props=claims&format=json&origin=*`,
  )
  const ent = j?.entities ? Object.values(j.entities)[0] : undefined
  const claims = ent?.claims?.[prop] ?? []
  const best = claims.find((c) => c.rank === 'preferred') ?? claims[0]
  return best?.mainsnak?.datavalue?.value ?? null // Wikidata accetta solo file di Commons
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/** Verifica su Commons: licenza ammessa → immagine + attribuzione; altrimenti null. */
export async function verifyCommonsFile(file: string, width: number): Promise<ResolvedImage | null> {
  type CA = {
    query?: {
      pages?: Record<string, {
        imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[]
      }>
    }
  }
  const j = await getJSON<CA>(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${width}&iiextmetadatafilter=LicenseShortName|Artist|Credit&format=json&origin=*`,
  )
  const page = j?.query?.pages ? Object.values(j.query.pages)[0] : undefined
  const info = page?.imageinfo?.[0]
  const meta = info?.extmetadata ?? {}
  const license = stripHtml(meta.LicenseShortName?.value ?? '')
  if (!info || !license || !ALLOWED.test(license)) return null
  const artist = stripHtml(meta.Artist?.value ?? '') || 'Autore su Commons'
  return {
    src: info.thumburl ?? info.url ?? commonsUrl(file, width),
    tier: 2,
    credit: `${artist.slice(0, 80)} · ${license} · Wikimedia Commons`,
    page: info.descriptionurl,
  }
}

function resolve(key: string, run: () => Promise<ResolvedImage | null>): Promise<ResolvedImage | null> {
  const hit = mem.get(key)
  if (hit) return hit
  const store = load()
  const c = store[key]
  if (c && Date.now() - c.t < TTL) {
    const p = Promise.resolve(c.v)
    mem.set(key, p)
    return p
  }
  const p = run()
    .catch(() => null)
    .then((v) => {
      const s = load()
      s[key] = { t: Date.now(), v }
      save(s)
      return v
    })
  mem.set(key, p)
  return p
}

async function firstVerified(cands: (() => Promise<string | null>)[], width: number, accept?: (file: string) => boolean) {
  const tried = new Set<string>()
  for (const c of cands) {
    const file = await c().catch(() => null)
    if (!file || tried.has(file) || (accept && !accept(file))) continue
    tried.add(file)
    const ok = await verifyCommonsFile(file, width)
    if (ok) return ok
  }
  return null
}

export function resolveDriverPhoto(driverId: string, wikiUrl?: string): Promise<ResolvedImage | null> {
  const cur = DRIVER_PHOTOS[driverId]
  if (cur) return Promise.resolve({ src: commonsUrl(cur.file), tier: 1, focal: cur.focal, credit: `${cur.author ?? 'Autore su Commons'} · ${cur.license} · Wikimedia Commons` })
  const w = wikiTitle(wikiUrl)
  if (!w) return Promise.resolve(null)
  return resolve(`d:${driverId}`, () => firstVerified([() => summaryFile(w), () => wikidataFile(w, 'P18')], 400, (f) => /\.(jpe?g|png|webp)$/i.test(f)))
}

export function resolveTeamLogo(constructorId: string, wikiUrl?: string): Promise<ResolvedImage | null> {
  const cur = TEAM_LOGOS[constructorId]
  if (cur) return Promise.resolve({ src: commonsUrl(cur.file, 300), tier: 1, credit: `${cur.author ?? 'Wikimedia Commons'} · ${cur.license}` })
  const w = wikiTitle(wikiUrl)
  if (!w) return Promise.resolve(null)
  // i loghi sono grafiche: si accettano solo SVG/PNG (scarta le foto delle auto)
  return resolve(`t:${constructorId}`, () => firstVerified([() => wikidataFile(w, 'P154'), () => summaryFile(w)], 300, (f) => /\.(svg|png)$/i.test(f)))
}
