import { useSearchParams } from 'react-router-dom'
import { jolpica, raceStatus } from '../api/jolpica'
import type { SessionCode } from '../api/openf1model'
import { useApi } from '../hooks/useApi'
import { useSeasonParam } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'
import { MButton, MCard, MEmptyState, MSelect } from '../design'
import { Async, PageHead, SkeletonList, usePageTitle } from '../components/ui'
import { SeasonSelect } from '../components/SeasonSelect'
import { PracticeTable, QualifyingTable, RaceResultTable } from '../components/ResultTables'

type Sess = 'race' | 'quali' | 'sprint' | 'FP1' | 'FP2' | 'FP3'

export default function Results() {
  const { t } = useSettings()
  usePageTitle(t('results.title'))
  const [season] = useSeasonParam()
  const [params, setParams] = useSearchParams()
  const schedule = useApi(() => jolpica.schedule(season), [season])
  const past = (schedule.data ?? []).filter((r) => raceStatus(r) !== 'upcoming')
  const round = params.get('round') ?? past[past.length - 1]?.round ?? ''
  const sess = (params.get('s') as Sess) || 'race'
  const race = schedule.data?.find((r) => r.round === round)

  const update = (patch: Record<string, string>) =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      Object.entries(patch).forEach(([k, v]) => n.set(k, v))
      return n
    }, { replace: true })

  const sessOptions: { v: Sess; l: string }[] = [
    { v: 'race', l: t('session.race') },
    { v: 'quali', l: t('session.quali') },
    ...(race?.Sprint ? [{ v: 'sprint' as Sess, l: t('session.sprint') }] : []),
    { v: 'FP1', l: t('session.fp1') },
    ...(race?.Sprint ? [] : [{ v: 'FP2' as Sess, l: t('session.fp2') }, { v: 'FP3' as Sess, l: t('session.fp3') }]),
  ]

  return (
    <div className="page">
      <PageHead title={t('results.title')} />
      <div className="filters">
        <SeasonSelect value={season} onChange={(s) => setParams({ season: String(s) }, { replace: true })} />
        <MSelect label={t('results.gp')} value={round} onChange={(e) => update({ round: e.target.value })} disabled={!past.length}>
          {!past.length && <option value="">{t('results.pickGp')}</option>}
          {past.map((r) => <option key={r.round} value={r.round}>R{r.round} · {r.raceName}</option>)}
        </MSelect>
        <MSelect label={t('results.session')} value={sess} onChange={(e) => update({ s: e.target.value })}>
          {sessOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </MSelect>
      </div>
      <MCard>
        <Async state={schedule} skeleton={<SkeletonList rows={12} />} isEmpty={() => !past.length} emptyTitle={t('race.notYet')}>
          {() => race ? (
            <div className="stack">
              <div className="row row--between row--wrap">
                <h2 className="m3-title-large" style={{ margin: 0 }}>{race.raceName}</h2>
                <MButton variant="text" size="sm" to={`/gara/${season}/${race.round}`} icon="open_in_new">{t('race.info')}</MButton>
              </div>
              <SessionResults season={season} round={race.round} date={race.date} sess={sess} />
            </div>
          ) : <MEmptyState icon="flag" title={t('results.pickGp')} />}
        </Async>
      </MCard>
    </div>
  )
}

function SessionResults({ season, round, date, sess }: { season: number; round: string; date: string; sess: Sess }) {
  const { t } = useSettings()
  const isFp = sess.startsWith('FP')
  const s = useApi(async () => {
    if (sess === 'race') return { kind: 'race' as const, race: await jolpica.raceResults(season, round) }
    if (sess === 'sprint') return { kind: 'sprint' as const, race: await jolpica.sprint(season, round) }
    if (sess === 'quali') return { kind: 'quali' as const, race: await jolpica.qualifying(season, round) }
    return null
  }, [season, round, sess], !isFp)
  if (isFp) return <PracticeTable season={season} raceDate={date} code={sess as SessionCode} />
  return (
    <Async
      state={s}
      skeleton={<SkeletonList rows={12} />}
      isEmpty={(d) => !d?.race || !(d.race.Results?.length || d.race.SprintResults?.length || d.race.QualifyingResults?.length)}
      emptyTitle={t('race.notYet')}
    >
      {(d) =>
        d!.kind === 'quali' ? (
          <QualifyingTable results={d!.race!.QualifyingResults!} season={season} caption={t('session.quali')} />
        ) : (
          <RaceResultTable results={(d!.kind === 'race' ? d!.race!.Results : d!.race!.SprintResults)!} season={season} caption={t(`session.${d!.kind}`)} />
        )
      }
    </Async>
  )
}
