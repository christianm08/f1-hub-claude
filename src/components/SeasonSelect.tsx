// Selettore stagione: solo stagioni reali dall'endpoint /seasons, dal 2014 (era ibrida).

import { jolpica } from '../api/jolpica'
import { MSelect } from '../design'
import { useApi } from '../hooks/useApi'
import { FIRST_SEASON } from '../hooks/useSeasonParam'
import { useSettings } from '../store/settings'

export function useSeasons() {
  return useApi(async () => (await jolpica.seasons()).filter((s) => s >= FIRST_SEASON).sort((a, b) => b - a), [])
}

export function SeasonSelect({ value, onChange }: { value: number; onChange: (s: number) => void }) {
  const { t } = useSettings()
  const seasons = useSeasons()
  const list = seasons.data ?? [value]
  const opts = list.includes(value) ? list : [value, ...list]
  return (
    <div style={{ minWidth: 130 }}>
      <MSelect label={t('common.season')} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {opts.map((s) => <option key={s} value={s}>{s}</option>)}
      </MSelect>
    </div>
  )
}
