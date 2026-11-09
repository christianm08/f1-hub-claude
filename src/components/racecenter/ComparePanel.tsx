// Confronto tra due piloti sui tempi sul giro (lazy). Solo dati già caricati: nessuna richiesta extra.

import { useState } from 'react'
import type { RCData } from '../../api/openf1live'
import { fmtLap, teamHex } from '../../api/openf1model'
import { useSettings } from '../../store/settings'
import { MCard, MEmptyState, MSelect } from '../../design'

export default function ComparePanel({ data, at, initial }: { data: RCData; at: string | null; initial: number | null }) {
  const { t } = useSettings()
  const ds = data.drivers
  const [a, setA] = useState<number | null>(initial ?? ds[0]?.driver_number ?? null)
  const [b, setB] = useState<number | null>(ds.find((d) => d.driver_number !== (initial ?? ds[0]?.driver_number))?.driver_number ?? null)
  const lapsOf = (n: number | null) => new Map(data.laps.filter((l) => l.driver_number === n && l.lap_duration && (!at || !l.date_start || l.date_start <= at)).map((l) => [l.lap_number, l.lap_duration!]))
  const la = lapsOf(a), lb = lapsOf(b)
  const common = [...la.keys()].filter((k) => lb.has(k)).sort((x, y) => x - y)
  const deltas = common.map((k) => ({ lap: k, d: la.get(k)! - lb.get(k)! })).filter((x) => Math.abs(x.d) < 20)
  const maxAbs = Math.max(0.5, ...deltas.map((x) => Math.abs(x.d)))
  const da = ds.find((d) => d.driver_number === a), db = ds.find((d) => d.driver_number === b)
  const W = 600, H = 160
  const bw = W / Math.max(1, deltas.length)
  const best = (m: Map<number, number>) => (m.size ? Math.min(...m.values()) : null)
  const cum = deltas.reduce((s, x) => s + x.d, 0)

  return (
    <MCard title={t('live.tab.compare')}>
      <div className="filters">
        <MSelect label={t('live.compareA')} value={a ?? ''} onChange={(e) => setA(Number(e.target.value))}>
          {ds.map((d) => <option key={d.driver_number} value={d.driver_number}>{d.name_acronym} · {d.full_name}</option>)}
        </MSelect>
        <MSelect label={t('live.compareB')} value={b ?? ''} onChange={(e) => setB(Number(e.target.value))}>
          {ds.map((d) => <option key={d.driver_number} value={d.driver_number}>{d.name_acronym} · {d.full_name}</option>)}
        </MSelect>
      </div>
      {!deltas.length ? <MEmptyState icon="compare_arrows" title={t('common.empty')} /> : (
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="weather-grid">
            <div className="stat"><span className="stat__l">{da?.name_acronym} · {t('common.best')}</span><b className="mono">{fmtLap(best(la))}</b></div>
            <div className="stat"><span className="stat__l">{db?.name_acronym} · {t('common.best')}</span><b className="mono">{fmtLap(best(lb))}</b></div>
            <div className="stat"><span className="stat__l">Σ {t('live.compareDelta')}</span><b className="mono">{cum > 0 ? '+' : ''}{cum.toFixed(3)} s</b></div>
          </div>
          <span className="m3-label-medium m3-muted">{t('live.compareDelta')}</span>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('live.compareDelta')}>
            <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="chart__grid" />
            {deltas.map((x, i) => {
              const h = (Math.abs(x.d) / maxAbs) * (H / 2 - 6)
              return (
                <rect key={x.lap} x={i * bw + 1} width={Math.max(1, bw - 2)} y={x.d < 0 ? H / 2 - h : H / 2} height={h} rx="1.5" fill={x.d < 0 ? teamHex(da) : teamHex(db)}>
                  <title>{`L${x.lap}: ${x.d > 0 ? '+' : ''}${x.d.toFixed(3)} s`}</title>
                </rect>
              )
            })}
          </svg>
          <p className="note">▲ {da?.name_acronym} · ▼ {db?.name_acronym}</p>
        </div>
      )}
    </MCard>
  )
}
