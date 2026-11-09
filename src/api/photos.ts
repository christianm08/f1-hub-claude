// Risoluzione immagini a 3 livelli (foto piloti e loghi team):
//  1. mappa curata in data/assets.ts (licenza verificata file per file)
//  2. immagine infobox dell'articolo Wikipedia via REST API (/api/rest_v1/page/summary/),
//     deterministica (stesso articolo → stessa immagine), accettata SOLO se ospitata su
//     Wikimedia Commons (/wikipedia/commons/): Commons ospita esclusivamente file liberi.
//     I file locali di en.wikipedia (/wikipedia/en/) possono essere non liberi → scartati.
//  3. placeholder (gestito dai componenti)
// Mai foto di altri piloti, mai immagini casuali dal web. Cache locale 90 giorni.

import { DRIVER_PHOTOS, TEAM_LOGOS, commonsUrl } from '../data/assets'

const LS_KEY = 'f1hub:photos:v1'
const TTL = 90 * 24 * 3600_000

export interface ResolvedImage {
  src: string
  tier: 1 | 2
  focal?: string
  credit: string
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

async function fromWikipedia(url: string | undefined, kind: 'portrait' | 'logo'): Promise<ResolvedImage | null> {
  const w = wikiTitle(url)
  if (!w) return null
  const res = await fetch(`https://${w.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(w.title)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const j = (await res.json()) as { thumbnail?: { source: string }; originalimage?: { source: string } }
  const src = j.thumbnail?.source ?? j.originalimage?.source
  if (!src || !src.includes('/wikipedia/commons/')) return null // solo file liberi su Commons
  if (kind === 'logo' && !/\.(svg|png)/i.test(src)) return null // i loghi sono grafiche, non foto
  const sized = src.replace(/\/(\d+)px-/, '/400px-')
  return { src: sized, tier: 2, credit: 'Wikimedia Commons / Wikipedia' }
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

export function resolveDriverPhoto(driverId: string, wikiUrl?: string): Promise<ResolvedImage | null> {
  const cur = DRIVER_PHOTOS[driverId]
  if (cur) return Promise.resolve({ src: commonsUrl(cur.file), tier: 1, focal: cur.focal, credit: `Wikimedia Commons, ${cur.license}` })
  return resolve(`d:${driverId}`, () => fromWikipedia(wikiUrl, 'portrait'))
}

export function resolveTeamLogo(constructorId: string, wikiUrl?: string): Promise<ResolvedImage | null> {
  const cur = TEAM_LOGOS[constructorId]
  if (cur) return Promise.resolve({ src: commonsUrl(cur.file, 300), tier: 1, credit: `Wikimedia Commons, ${cur.license}` })
  return resolve(`t:${constructorId}`, () => fromWikipedia(wikiUrl, 'logo'))
}
