// Team radio (lazy): audio MP3 dalla CDN ufficiale F1 (livetiming.formula1.com) via OpenF1.
// Attribuzione obbligatoria: "Audio: Formula 1 / OpenF1".

import type { RCData } from '../../api/openf1live'
import { teamHex } from '../../api/openf1model'
import { useSettings } from '../../store/settings'
import { MCard, MEmptyState } from '../../design'

export default function TeamRadioPanel({ data, at, driver }: { data: RCData; at: string | null; driver: number | null }) {
  const { t, locale } = useSettings()
  const drivers = new Map(data.drivers.map((d) => [d.driver_number, d]))
  const list = data.teamRadio
    .filter((r) => (!at || r.date <= at) && (driver == null || r.driver_number === driver))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60)
  return (
    <MCard title={t('live.tab.radio')}>
      {!list.length ? <MEmptyState icon="radio" title={t('live.noRadio')} /> : (
        <div className="stack" style={{ maxHeight: 560, overflow: 'auto' }}>
          {list.map((r) => {
            const d = drivers.get(r.driver_number)
            return (
              <div className="radio-item" key={r.recording_url}>
                <span className="row m3-body-small">
                  <span className="team-bar" style={{ background: teamHex(d), minHeight: 16 }} />
                  <b className="mono">{d?.name_acronym ?? r.driver_number}</b>
                  <span className="m3-muted">{d?.team_name}</span>
                  <span className="grow" />
                  <span className="mono m3-muted">{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(r.date))}</span>
                </span>
                <audio controls preload="none" src={r.recording_url} aria-label={`${t('live.tab.radio')} ${d?.full_name ?? r.driver_number}`} />
              </div>
            )
          })}
        </div>
      )}
      <p className="note" style={{ marginTop: 8 }}>{t('live.radioAttribution')}</p>
    </MCard>
  )
}
