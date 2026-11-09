// Tracciato vettoriale (bacinger/f1-circuits, MIT). Se manca: placeholder elegante + n/d.

import { TRACKS } from '../data/tracks'
import { MIcon } from '../design'
import { useSettings } from '../store/settings'

export function TrackMap({ circuitId, stroke = 14, showStart = true, className, label }: { circuitId: string; stroke?: number; showStart?: boolean; className?: string; label?: string }) {
  const { t } = useSettings()
  const tr = TRACKS[circuitId]
  if (!tr)
    return (
      <div className={`track-ph ${className ?? ''}`}>
        <div className="stack" style={{ justifyItems: 'center', gap: 4 }}>
          <MIcon name="route" size={32} />
          <span className="m3-label-large">{t('circuits.noTrack')}</span>
          <span className="m3-body-small">{t('common.na')}</span>
        </div>
      </div>
    )
  const pad = stroke * 2
  return (
    <svg className={`track-svg ${className ?? ''}`} viewBox={`${-pad} ${-pad} ${tr.w + pad * 2} ${tr.h + pad * 2}`} role="img" aria-label={label ?? tr.name}>
      <path d={tr.d} className="track-svg__base" strokeWidth={stroke * 2.2} />
      <path d={tr.d} className="track-svg__line" strokeWidth={stroke * 0.55} />
      {showStart && <circle cx={tr.start[0]} cy={tr.start[1]} r={stroke * 1.1} className="track-svg__start" />}
    </svg>
  )
}
