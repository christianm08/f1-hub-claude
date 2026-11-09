// Aggregazione news via rss2json (proxy CORS keyless).
// Solo titolo, estratto breve (≤ ~170 caratteri), fonte, data e link all'originale.

import { fetchJSON, MINUTE } from './client'

export const FEEDS = [
  { id: 'motorsport', name: 'Motorsport.com Italia', url: 'https://it.motorsport.com/rss/f1/news/' },
  { id: 'pittalk', name: 'PitTalk', url: 'https://www.pittalk.it/feed/' },
] as const

export type NewsCategory = 'latest' | 'races' | 'market' | 'tech' | 'teams' | 'rules'
export const NEWS_CATEGORIES: NewsCategory[] = ['latest', 'races', 'market', 'tech', 'teams', 'rules']

export interface NewsItem {
  id: string
  title: string
  excerpt: string
  source: string
  date: Date | null
  link: string
  categories: NewsCategory[]
}

interface Rss2Json {
  status: 'ok' | 'error'
  message?: string
  items?: { title: string; pubDate: string; link: string; guid?: string; description?: string; content?: string }[]
}

const MAX_PER_FEED = 15
const EXCERPT_MAX = 170

function stripHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function excerpt(text: string) {
  if (text.length <= EXCERPT_MAX) return text
  const cut = text.slice(0, EXCERPT_MAX)
  return cut.slice(0, cut.lastIndexOf(' ') > 100 ? cut.lastIndexOf(' ') : EXCERPT_MAX).trim() + '…'
}

const RULES: [Exclude<NewsCategory, 'latest'>, RegExp][] = [
  ['market', /mercato|contratt|ingaggi|rinnov|sedile|annunci[ao] .*pilot|firma|trasferi|lascia (la|il)|ufficiale:? .* (pilota|team)|line.?up|driver market|signs?\b/i],
  ['tech', /tecnic|aerodinam|power unit|motore|aggiornament|fondo|ala |alettone|sospension|telaio|galleria del vento|upgrade|downforce|pance|cfd/i],
  ['rules', /regolament|fia\b|penalit|sanzion|squalific|commissari|budget cap|norm[ae]|steward|reclamo|appello|direttiva/i],
  ['teams', /ferrari|mercedes|red bull|mclaren|aston martin|alpine|williams|racing bulls|\brb\b|sauber|audi|haas|cadillac|team principal|scuderia/i],
  ['races', /gran premio|\bgp\b|gara|qualific|pole|podio|vittoria|vince|libere|sprint|griglia|giro veloce|safety car|ordine d'arrivo/i],
]

export function categorize(title: string, text: string): NewsCategory[] {
  const hay = `${title} ${text}`
  const cats: NewsCategory[] = ['latest']
  for (const [c, re] of RULES) if (re.test(hay)) cats.push(c)
  return cats
}

function normTitle(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9à-ù ]/gi, '').replace(/\s+/g, ' ').trim()
}

export async function fetchNews(signal?: AbortSignal): Promise<{ items: NewsItem[]; failed: string[] }> {
  const failed: string[] = []
  const lists = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const d = await fetchJSON<Rss2Json>(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.url)}`, { ttl: 15 * MINUTE, signal })
        if (d.status !== 'ok' || !d.items) throw new Error(d.message ?? 'feed non valido')
        return d.items.slice(0, MAX_PER_FEED).map<NewsItem>((it) => {
          const text = stripHtml(it.description || it.content || '')
          const date = it.pubDate ? new Date(it.pubDate.replace(' ', 'T') + (it.pubDate.includes('Z') || it.pubDate.includes('+') ? '' : 'Z')) : null
          return {
            id: it.guid || it.link,
            title: stripHtml(it.title),
            excerpt: excerpt(text),
            source: f.name,
            date: date && !Number.isNaN(date.getTime()) ? date : null,
            link: it.link,
            categories: categorize(it.title, text),
          }
        })
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw e
        failed.push(f.name)
        return []
      }
    }),
  )
  const seen = new Set<string>()
  const items = lists
    .flat()
    .filter((n) => {
      const k = normTitle(n.title)
      if (seen.has(k) || seen.has(n.link)) return false
      seen.add(k)
      seen.add(n.link)
      return true
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
  return { items, failed }
}
