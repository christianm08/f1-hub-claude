// Componenti Material 3 Expressive (28 + provider/hook).
/* eslint-disable react-refresh/only-export-components */
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { MIcon, type IconName } from './icons'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ───────── Buttons ─────────
type BtnVariant = 'filled' | 'brand' | 'tonal' | 'outlined' | 'text'
export interface MButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  icon?: IconName
  size?: 'md' | 'sm'
  to?: string
  href?: string
}
export function MButton({ variant = 'filled', icon, size = 'md', to, href, className, children, ...rest }: MButtonProps) {
  const cls = cx('m3-btn m3-state', `m3-btn--${variant}`, size === 'sm' && 'm3-btn--sm', className)
  const inner = (
    <>
      {icon && <MIcon name={icon} size={18} />}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (href) return <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{inner}</a>
  return <button type="button" className={cls} {...rest}>{inner}</button>
}

export interface MIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  variant?: 'standard' | 'tonal' | 'filled'
  to?: string
  size?: number
}
export function MIconButton({ icon, label, variant = 'standard', to, size = 24, className, ...rest }: MIconButtonProps) {
  const cls = cx('m3-icon-btn m3-state', variant !== 'standard' && `m3-icon-btn--${variant}`, className)
  if (to) return <Link to={to} className={cls} aria-label={label} title={label}><MIcon name={icon} size={size} /></Link>
  return (
    <button type="button" className={cls} aria-label={label} title={label} {...rest}>
      <MIcon name={icon} size={size} />
    </button>
  )
}

// ───────── Card ─────────
export interface MCardProps {
  variant?: 'elevated' | 'filled' | 'outlined' | 'low'
  to?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  title?: ReactNode
  action?: ReactNode
  as?: 'section' | 'article' | 'div'
  'aria-label'?: string
}
export function MCard({ variant = 'low', to, className, style, children, title, action, as = 'section', ...a }: MCardProps) {
  const cls = cx('m3-card', variant !== 'low' && `m3-card--${variant}`, to && 'm3-card--link m3-state', className)
  const head = title ? (
    <div className="m3-card__title">
      {typeof title === 'string' ? <h2 className="m3-title-large">{title}</h2> : title}
      {action}
    </div>
  ) : null
  if (to) return <Link to={to} className={cls} style={style} aria-label={a['aria-label']}>{head}{children}</Link>
  const Tag = as
  return <Tag className={cls} style={style} aria-label={a['aria-label']}>{head}{children}</Tag>
}

// ───────── Chip ─────────
export function MChip({ selected, icon, children, onClick, static: isStatic, className, style }: { selected?: boolean; icon?: IconName; children: ReactNode; onClick?: () => void; static?: boolean; className?: string; style?: CSSProperties }) {
  if (isStatic) return <span className={cx('m3-chip m3-chip--static', selected && 'm3-chip--selected', className)} style={style}>{icon && <MIcon name={icon} size={16} />}{children}</span>
  return (
    <button type="button" className={cx('m3-chip m3-state', className)} aria-pressed={!!selected} onClick={onClick} style={style}>
      {icon && <MIcon name={selected ? 'check' : icon} size={18} />}
      {!icon && selected && <MIcon name="check" size={18} />}
      {children}
    </button>
  )
}

// ───────── Navigation ─────────
export interface NavItem { to: string; label: string; icon: IconName; badge?: boolean; end?: boolean }

export function MNavRail({ items, isActive, footer }: { items: NavItem[]; isActive: (to: string, end?: boolean) => boolean; footer?: ReactNode }) {
  return (
    <nav className="m3-navrail" aria-label="Navigazione principale">
      <ul>
        {items.map((it) => {
          const active = isActive(it.to, it.end)
          return (
            <li key={it.to}>
              <Link to={it.to} className={cx('m3-navrail__item', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                <span className="m3-navrail__pill m3-state"><MIcon name={it.icon} size={24} />{it.badge && <span className="m3-badge m3-badge--dot m3-nav-dot" />}</span>
                <span className="m3-navrail__label">{it.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {footer}
    </nav>
  )
}

export function MNavBar({ items, isActive, onMore, moreLabel, moreActive }: { items: NavItem[]; isActive: (to: string, end?: boolean) => boolean; onMore: () => void; moreLabel: string; moreActive: boolean }) {
  return (
    <nav className="m3-navbar glass-nav" aria-label="Navigazione principale">
      {items.map((it) => {
        const active = isActive(it.to, it.end)
        return (
          <Link key={it.to} to={it.to} className={cx('m3-navbar__item', active && 'is-active')} aria-current={active ? 'page' : undefined}>
            <span className="m3-navbar__pill m3-state"><MIcon name={it.icon} size={24} />{it.badge && <span className="m3-badge m3-badge--dot m3-nav-dot" />}</span>
            <span className="m3-navbar__label">{it.label}</span>
          </Link>
        )
      })}
      <button type="button" className={cx('m3-navbar__item', moreActive && 'is-active')} onClick={onMore} aria-haspopup="dialog">
        <span className="m3-navbar__pill m3-state"><MIcon name="more_horiz" size={24} /></span>
        <span className="m3-navbar__label">{moreLabel}</span>
      </button>
    </nav>
  )
}

export function MTopAppBar({ title, leading, actions, scrolled }: { title: ReactNode; leading?: ReactNode; actions?: ReactNode; scrolled: boolean }) {
  return (
    <header className={cx('m3-appbar glass-appbar', scrolled && 'is-scrolled')}>
      {leading}
      <div className="m3-appbar__title">{title}</div>
      <div className="m3-appbar__actions">{actions}</div>
    </header>
  )
}

// ───────── Tabs / segmented ─────────
export interface TabDef<T extends string> { id: T; label: string; icon?: IconName }
export function MTabs<T extends string>({ tabs, value, onChange, label }: { tabs: TabDef<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div className="m3-tabs" role="tablist" aria-label={label}>
      {tabs.map((tb, i) => (
        <button
          key={tb.id}
          ref={(el) => { refs.current[i] = el }}
          role="tab"
          type="button"
          className="m3-tab m3-state"
          aria-selected={tb.id === value}
          tabIndex={tb.id === value ? 0 : -1}
          onClick={() => onChange(tb.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
            refs.current[n]?.focus()
            onChange(tabs[n].id)
          }}
        >
          {tb.icon && <MIcon name={tb.icon} size={20} />}
          {tb.label}
        </button>
      ))}
    </div>
  )
}

export function MSegmentedButton<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="m3-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="m3-state" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value ? <MIcon name="check" size={18} /> : o.icon && <MIcon name={o.icon} size={18} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ───────── Inputs ─────────
export function MSearchBar({ value, onChange, placeholder, autoFocus, onEnter, trailing }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onEnter?: () => void; trailing?: ReactNode }) {
  return (
    <div className="m3-search">
      <MIcon name="search" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.() }}
      />
      {trailing}
    </div>
  )
}

export function MTextField({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId()
  return (
    <label className="m3-field" htmlFor={id}>
      <span className="m3-field__label">{label}</span>
      <input id={id} className="m3-input" {...rest} />
    </label>
  )
}

export function MSelect({ label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return (
    <label className="m3-field" htmlFor={id}>
      <span className="m3-field__label">{label}</span>
      <select id={id} className="m3-select" {...rest}>{children}</select>
    </label>
  )
}

export function MSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" className="m3-switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
}

// ───────── Menu ─────────
export function MMenu({ trigger, children, label }: { trigger: (open: () => void, expanded: boolean) => ReactNode; children: (close: () => void) => ReactNode; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="m3-menu-wrap" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && <div className="m3-menu glass-menu" role="menu" aria-label={label}>{children(() => setOpen(false))}</div>}
    </div>
  )
}
export function MMenuItem({ icon, children, onClick, to, selected }: { icon?: IconName; children: ReactNode; onClick?: () => void; to?: string; selected?: boolean }) {
  const inner = <>{icon && <MIcon name={icon} size={20} />}<span style={{ flex: 1 }}>{children}</span>{selected && <MIcon name="check" size={20} />}</>
  if (to) return <Link role="menuitem" to={to} className="m3-menu-item m3-state" onClick={onClick}>{inner}</Link>
  return <button role="menuitem" type="button" className="m3-menu-item m3-state" onClick={onClick}>{inner}</button>
}

// ───────── Dialog / sheet ─────────
function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    const ov = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => {
      const af = ref.current?.querySelector<HTMLElement>('[autofocus],input,button')
      af?.focus()
    }, 30)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ov; prev?.focus?.() }
  }, [open, onClose])
  return ref
}

export function MDialog({ open, onClose, title, children, closeLabel = 'Chiudi' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; closeLabel?: string }) {
  const ref = useModal(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="m3-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="m3-dialog glass-dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="m3-dialog__head">
          <h2 className="m3-headline-small">{title}</h2>
          <MIconButton icon="close" label={closeLabel} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function MBottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useModal(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="m3-scrim m3-sheet-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="m3-sheet glass-dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="m3-sheet__handle" aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ───────── Progress ─────────
export function MLinearProgress({ value, label }: { value?: number; label?: string }) {
  return (
    <div className={cx('m3-linear', value === undefined && 'm3-linear--indeterminate')} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="m3-linear__bar" style={value !== undefined ? { width: `${Math.max(0, Math.min(100, value))}%` } : undefined} />
    </div>
  )
}
export function MCircularProgress({ size = 40, label }: { size?: number; label?: string }) {
  return (
    <svg className="m3-circular" width={size} height={size} viewBox="0 0 48 48" role="progressbar" aria-label={label}>
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="90 200" />
    </svg>
  )
}

// ───────── Snackbar / toast ─────────
export function MSnackbar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="m3-snackbar" role="status"><span style={{ flex: 1 }}>{children}</span>{action}</div>
}

interface Toast { id: number; msg: string }
const ToastCtx = createContext<(msg: string) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setList((l) => [...l, { id, msg }])
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="m3-toast-host" aria-live="polite">
        {list.map((t) => <MSnackbar key={t.id}>{t.msg}</MSnackbar>)}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

// ───────── List ─────────
export function MList({ children, label }: { children: ReactNode; label?: string }) {
  return <ul className="m3-list" aria-label={label}>{children}</ul>
}
export function MListItem({ lead, headline, support, trail, to, onClick, active }: { lead?: ReactNode; headline: ReactNode; support?: ReactNode; trail?: ReactNode; to?: string; onClick?: () => void; active?: boolean }) {
  const body = (
    <>
      {lead}
      <div className="m3-list-item__main">
        <div className="m3-title-small">{headline}</div>
        {support && <div className="m3-body-small m3-muted">{support}</div>}
      </div>
      {trail && <div className="m3-list-item__trail">{trail}</div>}
    </>
  )
  const style = active ? { background: 'color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)' } : undefined
  if (to) return <li><Link to={to} className="m3-list-item m3-state" style={style}>{body}</Link></li>
  if (onClick) return <li><button type="button" className="m3-list-item m3-state" onClick={onClick} style={style} aria-pressed={active}>{body}</button></li>
  return <li className="m3-list-item" style={style}>{body}</li>
}
export function MDivider() {
  return <hr className="m3-divider" />
}

// ───────── Tooltip ─────────
export function MTooltip({ tip, children }: { tip: string; children: ReactNode }) {
  return <span className="m3-tooltip">{children}<span className="m3-tooltip__tip" role="tooltip">{tip}</span></span>
}

// ───────── Skeleton / states ─────────
export function MSkeleton({ w = '100%', h = 16, r, style }: { w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties }) {
  return <span className="m3-skeleton" aria-hidden style={{ width: w, height: h, borderRadius: r, ...style }} />
}

export function MEmptyState({ icon = 'info', title, text, action }: { icon?: IconName; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="m3-state-block">
      <div className="m3-state-block__icon"><MIcon name={icon} size={32} /></div>
      <h3 className="m3-title-medium">{title}</h3>
      {text && <p className="m3-body-medium">{text}</p>}
      {action}
    </div>
  )
}
export function MErrorState({ title, text, onRetry, retryLabel }: { title: string; text?: ReactNode; onRetry?: () => void; retryLabel: string }) {
  return (
    <div className="m3-state-block m3-state-block--error" role="alert">
      <div className="m3-state-block__icon"><MIcon name="cloud_off" size={32} /></div>
      <h3 className="m3-title-medium">{title}</h3>
      {text && <p className="m3-body-medium">{text}</p>}
      {onRetry && <MButton variant="tonal" icon="refresh" onClick={onRetry}>{retryLabel}</MButton>}
    </div>
  )
}

export function MBadge({ children, tone, className }: { children?: ReactNode; tone?: 'live' | 'primary' | 'error' | 'tertiary'; className?: string }) {
  return <span className={cx('m3-badge', tone && `m3-badge--${tone}`, className)}>{children}</span>
}

export function MFavButton({ active, onToggle, labelOn, labelOff }: { active: boolean; onToggle: () => void; labelOn: string; labelOff: string }) {
  return (
    <button
      type="button"
      className="m3-icon-btn m3-state m3-fav"
      aria-pressed={active}
      aria-label={active ? labelOn : labelOff}
      title={active ? labelOn : labelOff}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
    >
      <MIcon name={active ? 'favorite_fill' : 'favorite'} />
    </button>
  )
}

// ───────── Countdown ─────────
export function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  if (!target) return null
  const ms = Math.max(0, target.getTime() - now)
  return { ms, days: Math.floor(ms / 86_400_000), hours: Math.floor(ms / 3_600_000) % 24, minutes: Math.floor(ms / 60_000) % 60, seconds: Math.floor(ms / 1000) % 60, done: ms === 0 }
}

export function CountdownCells({ target, labels }: { target: Date; labels: [string, string, string, string] }) {
  const c = useCountdown(target)
  if (!c) return null
  const cells: [number, string][] = [[c.days, labels[0]], [c.hours, labels[1]], [c.minutes, labels[2]], [c.seconds, labels[3]]]
  return (
    <div className="m3-countdown" role="timer" aria-label={`${c.days} ${labels[0]} ${c.hours} ${labels[1]} ${c.minutes} ${labels[2]}`}>
      {cells.map(([n, l]) => (
        <div className="m3-countdown__cell" key={l}>
          <span className="m3-countdown__num" aria-hidden>{String(n).padStart(2, '0')}</span>
          <span className="m3-countdown__lbl" aria-hidden>{l}</span>
        </div>
      ))}
    </div>
  )
}
