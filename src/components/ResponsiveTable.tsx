// Tabelle M3 ad alta densità: MTable su desktop, MobileTable a card su mobile, MDetails espandibile.

import { useEffect, useState, type ReactNode } from 'react'
import { MIcon } from '../design'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T, i: number) => ReactNode
  num?: boolean
  width?: number | string
}

export function useMedia(query: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

export function MTable<T>({ columns, rows, rowKey, caption, highlight }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T, i: number) => string; caption?: string; highlight?: (r: T) => boolean }) {
  return (
    <div className="m3-table-wrap">
      <table className="m3-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.num ? 'num' : undefined} style={{ width: c.width }} scope="col">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className={highlight?.(r) ? 'is-highlight' : undefined}>
              {columns.map((c) => <td key={c.key} className={c.num ? 'num' : undefined}>{c.cell(r, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface MobileSpec<T> { lead: (r: T, i: number) => ReactNode; main: (r: T, i: number) => ReactNode; trail: (r: T, i: number) => ReactNode }

export function MobileTable<T>({ rows, rowKey, spec, label }: { rows: T[]; rowKey: (r: T, i: number) => string; spec: MobileSpec<T>; label?: string }) {
  return (
    <div className="m3-mtable" role="list" aria-label={label}>
      {rows.map((r, i) => (
        <div className="m3-mrow" role="listitem" key={rowKey(r, i)}>
          <div className="m3-mrow__lead">{spec.lead(r, i)}</div>
          <div className="m3-mrow__main">{spec.main(r, i)}</div>
          <div className="m3-mrow__trail">{spec.trail(r, i)}</div>
        </div>
      ))}
    </div>
  )
}

/** Tabella che passa da MTable a MobileTable sotto i 720px. */
export function ResponsiveTable<T>(p: { columns: Column<T>[]; rows: T[]; rowKey: (r: T, i: number) => string; mobile: MobileSpec<T>; caption?: string; highlight?: (r: T) => boolean }) {
  const mobile = useMedia('(max-width: 719px)')
  return mobile ? <MobileTable rows={p.rows} rowKey={p.rowKey} spec={p.mobile} label={p.caption} /> : <MTable {...p} />
}

export function MDetails({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="m3-details" open={open}>
      <summary className="m3-state">{summary}<MIcon name="expand_more" /></summary>
      <div className="m3-details__body">{children}</div>
    </details>
  )
}
