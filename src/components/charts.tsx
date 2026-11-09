// Grafici SVG puri, senza dipendenze.

import { useId } from 'react'

export interface SparkPoint { label: string; value: number }

export function Sparkline({ points, color = 'var(--md-sys-color-primary)', height = 180, ariaLabel }: { points: SparkPoint[]; color?: string; height?: number; ariaLabel: string }) {
  const id = useId().replace(/:/g, '')
  if (!points.length) return null
  const W = 640, H = height, L = 36, R = 12, T = 12, B = 26
  const max = Math.max(1, ...points.map((p) => p.value))
  const nice = max <= 10 ? 10 : Math.ceil(max / 50) * 50
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1))
  const y = (v: number) => T + (H - T - B) * (1 - v / nice)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H - B} L${x(0).toFixed(1)} ${H - B} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(nice * f))
  const every = Math.ceil(points.length / 8)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tk) => (
        <g key={tk}>
          <line className="chart__grid" x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} />
          <text x={L - 6} y={y(tk) + 4} textAnchor="end">{tk}</text>
        </g>
      ))}
      <path d={area} fill={`url(#g${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3.5" fill={color}>
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
          {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle">{p.label}</text>}
        </g>
      ))}
    </svg>
  )
}

export function BarList({ rows, color = 'var(--md-sys-color-primary)', format = (v: number) => String(v) }: { rows: { label: string; value: number; hint?: string; color?: string }[]; color?: string; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="barlist" role="list">
      {rows.map((r, i) => (
        <div className="barlist__row" role="listitem" key={i} title={r.hint}>
          <span className="ellipsis m3-body-small">{r.label}</span>
          <span className="barlist__track"><span className="barlist__fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? color }} /></span>
          <b className="tabular" style={{ minWidth: 28, textAlign: 'right' }}>{format(r.value)}</b>
        </div>
      ))}
    </div>
  )
}

/** Grafico multi-linea (punti cumulati). Legenda cliccabile per evidenziare una serie. */
export function LineChart({ labels, series, ariaLabel, height = 260 }: { labels: string[]; series: { id: string; name: string; color: string; values: number[]; dashed?: boolean }[]; ariaLabel: string; height?: number }) {
  const W = 720, H = height, L = 40, R = 16, T = 12, B = 28
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const step = max <= 50 ? 10 : max <= 200 ? 50 : 100
  const top = Math.ceil(max / step) * step
  const n = labels.length
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1))
  const y = (v: number) => T + (H - T - B) * (1 - v / top)
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 6 || i % Math.ceil(a.length / 5) === 0)
  const every = Math.ceil(n / 10)
  return (
    <div className="stack" style={{ gap: 8 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {ticks.map((tk) => (
          <g key={tk}>
            <line className="chart__grid" x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} />
            <text x={L - 6} y={y(tk) + 4} textAnchor="end">{tk}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % every === 0 || i === n - 1) && <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{l}</text>)}
        {series.map((s) => (
          <g key={s.id}>
            <path d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '7 5' : undefined} />
            {s.values.length > 0 && <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r="4.5" fill={s.color}><title>{`${s.name}: ${s.values[s.values.length - 1]}`}</title></circle>}
          </g>
        ))}
      </svg>
      <div className="row row--wrap" style={{ gap: 12 }} role="list">
        {series.map((s) => (
          <span key={s.id} role="listitem" className="row m3-body-small" style={{ gap: 6 }}>
            <span style={{ width: 16, height: 0, borderTop: `4px ${s.dashed ? 'dashed' : 'solid'} ${s.color}`, display: 'inline-block' }} />
            {s.name} <b className="tabular">{s.values[s.values.length - 1] ?? 0}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
