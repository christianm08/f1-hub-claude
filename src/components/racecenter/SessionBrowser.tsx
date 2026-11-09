// Scelta della sessione: anno (dal 2023) → weekend → sessione. Rileva la sessione live e ci entra da solo.

import { useEffect, useMemo, useState } from 'react'
import { openf1, OPENF1_FIRST_YEAR } from '../../api/openf1'
import { detectLiveSession, sessionEnded } from '../../api/openf1live'
import { normalizeSessionName } from '../../api/openf1model'
import { useApi } from '../../hooks/useApi'
import { useSettings } from '../../store/settings'
import { MButton, MIcon, MSelect } from '../../design'
import { fmtDateTime } from '../ui'

export function SessionBrowser({ current, onPick }: { current: number | null; onPick: (key: number) => void }) {
  const { t, locale } = useSettings()
  const thisYear = new Date().getFullYear()
  const years = useMemo(() => Array.from({ length: thisYear - OPENF1_FIRST_YEAR + 1 }, (_, i) => thisYear - i), [thisYear])
  const [year, setYear] = useState(thisYear)
  const [meeting, setMeeting] = useState<number | null>(null)
  const [session, setSession] = useState<number | null>(null)

  const live = useApi((signal) => detectLiveSession(signal), [], !current)
  useEffect(() => {
    if (!current && live.data) onPick(live.data.session_key)
  }, [live.data, current, onPick])

  // sincronizza i selettori con la sessione aperta da deep link
  const cur = useApi(async (signal) => (current ? (await openf1.sessions({ session_key: current }, { signal }))[0] ?? null : null), [current])
  useEffect(() => {
    if (cur.data) {
      setYear(cur.data.year)
      setMeeting(cur.data.meeting_key)
      setSession(cur.data.session_key)
    }
  }, [cur.data])

  const meetings = useApi((signal) => openf1.meetings(year, { signal }), [year])
  const sessions = useApi(async (signal) => (meeting ? openf1.sessions({ meeting_key: meeting }, { signal }) : []), [meeting])

  const now = Date.now()
  const mList = (meetings.data ?? []).filter((m) => new Date(m.date_start).getTime() <= now + 86_400_000).sort((a, b) => b.date_start.localeCompare(a.date_start))
  useEffect(() => {
    if (!meeting && mList.length && !current) setMeeting(mList[0].meeting_key)
  }, [mList, meeting, current])

  const sList = (sessions.data ?? []).filter((s) => new Date(s.date_start).getTime() <= now).sort((a, b) => a.date_start.localeCompare(b.date_start))
  useEffect(() => {
    if (sList.length && (!session || !sList.some((s) => s.session_key === session))) {
      const race = sList.find((s) => normalizeSessionName(s.session_name) === 'RACE')
      setSession((race ?? sList[sList.length - 1]).session_key)
    }
  }, [sList, session])

  return (
    <div className="stack">
      <div className="filters">
        <MSelect label={t('live.year')} value={year} onChange={(e) => { setYear(Number(e.target.value)); setMeeting(null); setSession(null) }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </MSelect>
        <MSelect label={t('live.meeting')} value={meeting ?? ''} onChange={(e) => { setMeeting(Number(e.target.value)); setSession(null) }} disabled={!mList.length}>
          {!mList.length && <option value="">{meetings.status === 'loading' ? t('common.loading') : t('common.empty')}</option>}
          {mList.map((m) => <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_name}</option>)}
        </MSelect>
        <MSelect label={t('live.session')} value={session ?? ''} onChange={(e) => setSession(Number(e.target.value))} disabled={!sList.length}>
          {!sList.length && <option value="">{sessions.status === 'loading' ? t('common.loading') : t('common.empty')}</option>}
          {sList.map((s) => <option key={s.session_key} value={s.session_key}>{s.session_name} · {fmtDateTime(new Date(s.date_start), locale)}{sessionEnded(s) ? '' : ' •'}</option>)}
        </MSelect>
        <MButton variant="filled" icon="play_arrow" disabled={!session || session === current} onClick={() => session && onPick(session)}>{t('live.load')}</MButton>
      </div>
      <p className="note row" style={{ gap: 6 }}>
        <MIcon name="history" size={16} />
        {t('live.replayFrom2023')} {!current && (live.status === 'loading' ? t('live.detecting') : live.data ? '' : t('live.noLive'))}
      </p>
    </div>
  )
}
