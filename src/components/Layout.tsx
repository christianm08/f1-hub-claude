// App shell: top app bar M3 (brand, ricerca, tema), nav rail desktop (10 voci),
// bottom bar mobile (4 primarie + "Altro" in bottom sheet), footer con attribuzioni, ricerca globale (Ctrl+K).

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MBottomSheet, MDialog, MIcon, MIconButton, MNavBar, MNavRail, MSearchBar, MTopAppBar, type IconName, type NavItem } from '../design'
import { useSettings } from '../store/settings'
import { jolpica, driverName } from '../api/jolpica'
import { fetchNews } from '../api/news'
import { useApi } from '../hooks/useApi'
import { PageSkeleton } from './ui'

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="F1 Hub — Home">
      <span className="brand__mark"><MIcon name="sports_motorsports" size={22} /></span>
      <span className="brand__name">F1 <b>Hub</b></span>
    </Link>
  )
}

export function Layout() {
  const { t, theme, set } = useSettings()
  const loc = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
    window.scrollTo({ top: 0 })
  }, [loc.pathname])

  const items: NavItem[] = useMemo(
    () => [
      { to: '/', label: t('nav.home'), icon: 'home', end: true },
      { to: '/calendario', label: t('nav.calendar'), icon: 'calendar_month' },
      { to: '/live', label: t('nav.live'), icon: 'sensors' },
      { to: '/classifiche', label: t('nav.standings'), icon: 'leaderboard' },
      { to: '/risultati', label: t('nav.results'), icon: 'flag' },
      { to: '/piloti', label: t('nav.drivers'), icon: 'person' },
      { to: '/team', label: t('nav.teams'), icon: 'groups' },
      { to: '/circuiti', label: t('nav.circuits'), icon: 'route' },
      { to: '/news', label: t('nav.news'), icon: 'newspaper' },
      { to: '/impostazioni', label: t('nav.settings'), icon: 'settings' },
    ],
    [t],
  )

  const isActive = useCallback(
    (to: string, end?: boolean) => {
      const p = loc.pathname
      if (end) return p === to
      if (to === '/calendario') return p.startsWith('/calendario') || p.startsWith('/gara')
      return p === to || p.startsWith(to + '/')
    },
    [loc.pathname],
  )
  const primary = items.slice(0, 4)
  const rest = items.slice(4)
  const moreActive = rest.some((i) => isActive(i.to))

  return (
    <div className="app">
      <a href="#main" className="sr-only">Skip</a>
      <MNavRail items={items} isActive={isActive} />
      <div className="app__main">
        <MTopAppBar
          scrolled={scrolled}
          title={<Brand />}
          actions={
            <>
              <button type="button" className="appbar-search m3-state" onClick={() => setSearchOpen(true)} aria-label={t('search.title')}>
                <MIcon name="search" size={20} />
                <span className="grow" style={{ textAlign: 'left' }}>{t('common.search')}…</span>
                <span className="kbd">Ctrl K</span>
              </button>
              <MIconButton className="appbar-search-icon" icon="search" label={t('search.title')} onClick={() => setSearchOpen(true)} />
              <MIconButton icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} label={t('theme.toggle')} onClick={() => set('theme', theme === 'dark' ? 'light' : 'dark')} />
            </>
          }
        />
        <main id="main">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="footer">
          <span>{t('common.images')}</span>
          <span>{t('footer.data')}</span>
          <span>{t('footer.disclaimer')}</span>
        </footer>
      </div>
      <MNavBar items={primary} isActive={isActive} onMore={() => setMoreOpen(true)} moreLabel={t('nav.more')} moreActive={moreActive} />
      <MBottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')}>
        <nav className="more-grid" aria-label={t('nav.menu')}>
          {rest.map((i) => (
            <Link key={i.to} to={i.to} className={isActive(i.to) ? 'is-active m3-state' : 'm3-state'} aria-current={isActive(i.to) ? 'page' : undefined}>
              <MIcon name={i.icon} size={26} />
              {i.label}
            </Link>
          ))}
        </nav>
      </MBottomSheet>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

// ───────── Ricerca globale ─────────
interface Hit { kind: 'driver' | 'team' | 'race' | 'circuit' | 'news'; title: string; sub: string; to?: string; href?: string; hay: string }
const KIND_ICON: Record<Hit['kind'], IconName> = { driver: 'person', team: 'groups', race: 'flag', circuit: 'route', news: 'newspaper' }

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, season } = useSettings()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  useEffect(() => { if (!open) setQ('') }, [open])

  const index = useApi(
    async (signal) => {
      const [drivers, teams, races, circuits, news] = await Promise.all([
        jolpica.drivers(season).catch(() => []),
        jolpica.constructors(season).catch(() => []),
        jolpica.schedule(season).catch(() => []),
        jolpica.circuits(season).catch(() => []),
        fetchNews(signal).then((r) => r.items).catch(() => []),
      ])
      const hits: Hit[] = [
        ...drivers.map<Hit>((d) => ({ kind: 'driver', title: driverName(d), sub: [d.code, d.nationality].filter(Boolean).join(' · '), to: `/piloti/${d.driverId}?season=${season}`, hay: norm(`${driverName(d)} ${d.code ?? ''} ${d.permanentNumber ?? ''}`) })),
        ...teams.map<Hit>((c) => ({ kind: 'team', title: c.name, sub: c.nationality, to: `/team/${c.constructorId}?season=${season}`, hay: norm(c.name) })),
        ...races.map<Hit>((r) => ({ kind: 'race', title: r.raceName, sub: `${r.Circuit.Location.locality}, ${r.Circuit.Location.country} · R${r.round}`, to: `/gara/${r.season}/${r.round}`, hay: norm(`${r.raceName} ${r.Circuit.Location.country} ${r.Circuit.Location.locality}`) })),
        ...circuits.map<Hit>((c) => ({ kind: 'circuit', title: c.circuitName, sub: `${c.Location.locality}, ${c.Location.country}`, to: `/circuiti?c=${c.circuitId}`, hay: norm(`${c.circuitName} ${c.Location.locality} ${c.Location.country}`) })),
        ...news.map<Hit>((n) => ({ kind: 'news', title: n.title, sub: n.source, href: n.link, hay: norm(n.title) })),
      ]
      return hits
    },
    [season],
    open,
  )

  const results = useMemo(() => {
    const nq = norm(q.trim())
    if (nq.length < 2 || !index.data) return []
    const terms = nq.split(/\s+/)
    return index.data
      .filter((h) => terms.every((tm) => h.hay.includes(tm)))
      .sort((a, b) => Number(b.hay.startsWith(nq)) - Number(a.hay.startsWith(nq)))
      .slice(0, 24)
  }, [q, index.data])

  const go = (h?: Hit) => {
    if (!h) return
    onClose()
    if (h.to) nav(h.to)
    else if (h.href) window.open(h.href, '_blank', 'noopener')
  }

  return (
    <MDialog open={open} onClose={onClose} title={t('search.title')} closeLabel={t('common.close')}>
      <MSearchBar value={q} onChange={setQ} placeholder={t('search.placeholder')} autoFocus onEnter={() => go(results[0])} />
      <p className="note" style={{ marginTop: 8 }}>{q.trim().length < 2 ? t('search.min') : t('search.hint')}</p>
      {index.status === 'loading' && q.trim().length >= 2 && <p className="note">{t('common.loading')}</p>}
      {q.trim().length >= 2 && index.data && !results.length && <p className="m3-body-medium m3-muted" style={{ padding: 16 }}>{t('search.none')}</p>}
      <ul className="m3-list search-results" aria-label={t('search.title')}>
        {results.map((h, i) => (
          <li key={`${h.kind}-${h.title}-${i}`}>
            <button type="button" className="m3-list-item m3-state" onClick={() => go(h)}>
              <span className="search-kind"><MIcon name={KIND_ICON[h.kind]} size={20} /></span>
              <span className="m3-list-item__main">
                <span className="m3-title-small" style={{ display: 'block' }}>{h.title}</span>
                <span className="m3-body-small m3-muted" style={{ display: 'block' }}>{t(`search.kind.${h.kind}`)} · {h.sub}</span>
              </span>
              <MIcon name={h.href ? 'open_in_new' : 'chevron_right'} size={20} />
            </button>
          </li>
        ))}
      </ul>
    </MDialog>
  )
}
