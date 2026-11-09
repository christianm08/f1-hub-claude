// Service worker di F1 Hub: rende l'app installabile e apribile offline (shell + asset già visti).
// NON mette in cache le risposte delle API dati: quella cache è gestita dall'app (con TTL) e
// offline l'app mostra i dati in cache o un messaggio onesto, mai dati inventati.
const VERSION = 'f1hub-sw-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png', './icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Font Google: cache-first (cambiano raramente)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => (r.ok && c.put(req, r.clone()), r))))
    return
  }
  if (url.origin !== self.location.origin) return // API e immagini esterne: nessuna intercettazione

  // Navigazione: network-first, fallback alla shell in cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); return r })
        .catch(() => caches.match('./index.html')),
    )
    return
  }
  // Asset con hash (immutabili) e statici: cache-first, poi rete
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok && (url.pathname.includes('/assets/') || url.pathname.includes('/icons/'))) {
        const copy = r.clone()
        caches.open(VERSION).then((c) => c.put(req, copy))
      }
      return r
    })),
  )
})
