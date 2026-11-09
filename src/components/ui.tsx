// Mattoncini UI condivisi dalle pagine.
/* eslint-disable react-refresh/only-export-components */
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MErrorState, MSkeleton, MEmptyState, MIcon } from '../design'
import type { ApiState } from '../hooks/useApi'
import { useSettings } from '../store/settings'
import { natInfo, teamColor } from '../data/meta'
import type { Driver } from '../api/jolpica'
import type { Sourced } from '../api/model'
import { FlagIcon } from './FlagIcon'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · F1 Hub` : 'F1 Hub'
  }, [title])
}

export function PageHead({ title, sub, tools, back }: { title: ReactNode; sub?: ReactNode; tools?: ReactNode; back?: string }) {
  const { t } = useSettings()
  return (
    <div className="page-head">
      <div className="stack" style={{ gap: 4 }}>
        {back && (
          <Link to={back} className="row m3-label-large m3-primary-text" style={{ textDecoration: 'none', gap: 4 }}>
            <MIcon name="arrow_back" size={18} /> {t('common.back')}
          </Link>
        )}
        <h1 className="m3-headline-large">{title}</h1>
        {sub && <p className="page-head__sub m3-body-medium">{sub}</p>}
      </div>
      {tools && <div className="page-head__tools">{tools}</div>}
    </div>
  )
}

/** Gestisce gli stati loading/error/empty di un useApi senza mai lasciare schermate bianche. */
export function Async<T>({ state, children, skeleton, isEmpty, emptyTitle, emptyText }: {
  state: ApiState<T> & { retry: () => void }
  children: (data: T) => ReactNode
  skeleton?: ReactNode
  isEmpty?: (d: T) => boolean
  emptyTitle?: string
  emptyText?: ReactNode
}) {
  const { t } = useSettings()
  if (state.status === 'error' && state.data === undefined)
    return <MErrorState title={t('common.error')} text={t('common.errorHint')} onRetry={state.retry} retryLabel={t('common.retry')} />
  if (state.data === undefined) return <>{skeleton ?? <SkeletonList />}</>
  if (isEmpty?.(state.data)) return <MEmptyState icon="hourglass_empty" title={emptyTitle ?? t('common.empty')} text={emptyText} />
  return <>{children(state.data)}</>
}

export function SkeletonList({ rows = 8, h = 44 }: { rows?: number; h?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="…">
      {Array.from({ length: rows }, (_, i) => <MSkeleton key={i} h={h} r={12} />)}
    </div>
  )
}

export function SkeletonCards({ n = 6, h = 160 }: { n?: number; h?: number }) {
  return (
    <div className="grid grid-cards" aria-busy="true">
      {Array.from({ length: n }, (_, i) => <MSkeleton key={i} h={h} r="24px 24px 24px 8px" />)}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="page">
      <MSkeleton h={40} w="40%" r={12} />
      <MSkeleton h={220} r="32px 32px 32px 10px" />
      <SkeletonCards n={6} />
    </div>
  )
}

export function Pos({ p }: { p?: string | number | null }) {
  const n = Number(p)
  return <span className={`pos ${n >= 1 && n <= 3 ? `pos--${n}` : ''}`}>{p ?? '—'}</span>
}

export function TeamBar({ id, color }: { id?: string; color?: string }) {
  return <span className="team-bar" style={{ background: color ?? teamColor(id) }} aria-hidden />
}

export function Nat({ nationality }: { nationality?: string }) {
  const n = natInfo(nationality)
  return <FlagIcon iso2={n.iso2} code={n.code} title={nationality} />
}

export function DriverLink({ d, season, showCode, showFlag = true }: { d: Driver; season?: number; showCode?: boolean; showFlag?: boolean }) {
  return (
    <Link to={`/piloti/${d.driverId}${season ? `?season=${season}` : ''}`} className="driver-chip">
      {showFlag && <Nat nationality={d.nationality} />}
      <span className="driver-chip__name">{d.givenName} <b>{d.familyName}</b></span>
      {showCode && d.code && <span className="code3">{d.code}</span>}
    </Link>
  )
}

export function fmtDate(d: Date | null | undefined, locale: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, opts).format(d)
}

export function fmtDateTime(d: Date | null | undefined, locale: string) {
  return fmtDate(d, locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function fmtNum(n: number | string | null | undefined, locale: string, digits = 0) {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? Number(n) : n
  if (!Number.isFinite(v)) return String(n)
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v)
}

export function NA() {
  const { t } = useSettings()
  return <span className="m3-muted">{t('common.na')}</span>
}

/** Valore con indicazione della fonte secondaria (f1api.dev) quando Jolpica non lo fornisce. */
export function SrcVal<T>({ s, fmt }: { s: Sourced<T>; fmt?: (v: T) => string }) {
  const { t } = useSettings()
  if (s.value === null) return <span className="m3-muted">{t('common.na')}</span>
  return <>{fmt ? fmt(s.value) : String(s.value)}{s.source === 'f1api' && <span className="src-tag">({t('common.sourceSecondary')})</span>}</>
}
