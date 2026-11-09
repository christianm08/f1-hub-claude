// Controlli replay (lazy): slider sull'intera sessione, play/pausa e velocità.

import { useEffect, useRef, useState } from 'react'
import type { OF1Session } from '../../api/openf1'
import { useSettings } from '../../store/settings'
import { MCard, MIconButton, MSegmentedButton } from '../../design'

const SPEEDS = ['1', '5', '20', '60'] as const

export default function ReplayPanel({ session, at, onChange }: { session: OF1Session; at: string | null; onChange: (iso: string | null) => void }) {
  const { t, locale } = useSettings()
  const start = new Date(session.date_start).getTime()
  const end = new Date(session.date_end).getTime()
  const cur = at ? new Date(at).getTime() : end
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>('20')
  const curRef = useRef(cur)
  curRef.current = cur

  useEffect(() => {
    if (!playing) return
    // tick di 1 s reale → `speed` secondi di sessione; i dati sono già in memoria (nessuna richiesta extra)
    const id = setInterval(() => {
      const next = Math.min(end, curRef.current + Number(speed) * 1000)
      onChange(next >= end ? null : new Date(next).toISOString())
      if (next >= end) setPlaying(false)
    }, 1000)
    return () => clearInterval(id)
  }, [playing, speed, end, onChange])

  const fmt = (ms: number) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(ms))
  return (
    <MCard title={t('live.tab.replay')} className="glass-race">
      <div className="replay">
        <div className="row row--between m3-body-small mono">
          <span>{fmt(start)}</span>
          <b>{at ? fmt(cur) : t('live.end')}</b>
          <span>{fmt(end)}</span>
        </div>
        <input
          type="range"
          min={start}
          max={end}
          step={1000}
          value={cur}
          aria-label={t('live.replayAt')}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange(v >= end ? null : new Date(v).toISOString())
          }}
        />
        <div className="row row--wrap">
          <MIconButton variant="filled" icon={playing ? 'pause' : 'play_arrow'} label={playing ? t('live.pause') : t('live.play')} onClick={() => { if (!at) onChange(new Date(start).toISOString()); setPlaying((p) => !p) }} />
          <MIconButton variant="tonal" icon="fast_rewind" label="−60 s" onClick={() => onChange(new Date(Math.max(start, cur - 60_000)).toISOString())} />
          <MIconButton variant="tonal" icon="fast_forward" label="+60 s" onClick={() => { const n = cur + 60_000; onChange(n >= end ? null : new Date(n).toISOString()) }} />
          <MIconButton variant="tonal" icon="skip_next" label={t('live.end')} onClick={() => { setPlaying(false); onChange(null) }} />
          <span className="grow" />
          <MSegmentedButton label={t('live.speedx')} value={speed} onChange={setSpeed} options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} />
        </div>
      </div>
    </MCard>
  )
}
