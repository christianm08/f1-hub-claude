import { clearCache } from '../api/client'
import { jolpica, driverName } from '../api/jolpica'
import { useApi } from '../hooks/useApi'
import { useSettings, NOTIF_KEYS } from '../store/settings'
import { MButton, MCard, MDivider, MIcon, MSegmentedButton, MSelect, MSwitch, useToast } from '../design'
import { PageHead, usePageTitle } from '../components/ui'
import { useSeasons } from '../components/SeasonSelect'
import type { ReactNode } from 'react'

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="row row--between row--wrap" style={{ gap: 16, padding: '8px 0' }}>
      <div className="stack grow" style={{ gap: 2, minWidth: 180 }}>
        <span className="m3-title-small">{label}</span>
        {hint && <span className="m3-body-small m3-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const s = useSettings()
  const { t } = s
  const toast = useToast()
  usePageTitle(t('settings.title'))
  const seasons = useSeasons()
  const lists = useApi(async () => {
    const [d, c] = await Promise.all([jolpica.drivers(s.season), jolpica.constructors(s.season)])
    return { d, c }
  }, [s.season])

  return (
    <div className="page">
      <PageHead title={t('settings.title')} />
      <div className="grid grid-2">
        <MCard title={t('settings.appearance')}>
          <Row label={t('settings.theme')}>
            <MSegmentedButton label={t('settings.theme')} value={s.theme} onChange={(v) => s.set('theme', v)} options={[{ value: 'dark', label: t('theme.dark'), icon: 'dark_mode' }, { value: 'light', label: t('theme.light'), icon: 'light_mode' }]} />
          </Row>
          <Row label={t('settings.language')}>
            <MSegmentedButton label={t('settings.language')} value={s.lang} onChange={(v) => s.set('lang', v)} options={[{ value: 'it', label: 'Italiano' }, { value: 'en', label: 'English' }]} />
          </Row>
          <Row label={t('settings.units')}>
            <MSegmentedButton label={t('settings.units')} value={s.units} onChange={(v) => s.set('units', v)} options={[{ value: 'metric', label: t('settings.metric') }, { value: 'imperial', label: t('settings.imperial') }]} />
          </Row>
          <Row label={t('settings.defaultSeason')}>
            <div style={{ width: 140 }}>
              <MSelect label={t('common.season')} value={s.season} onChange={(e) => s.set('season', Number(e.target.value))}>
                {(seasons.data ?? [s.season]).map((y) => <option key={y} value={y}>{y}</option>)}
              </MSelect>
            </div>
          </Row>
        </MCard>

        <MCard title={t('settings.favorites')}>
          <div className="stack">
            <MSelect label={t('settings.favDriver')} value={s.favDriverId ?? ''} onChange={(e) => s.set('favDriverId', e.target.value || null)}>
              <option value="">{t('settings.none')}</option>
              {(lists.data?.d ?? []).map((d) => <option key={d.driverId} value={d.driverId}>{driverName(d)}</option>)}
            </MSelect>
            <MSelect label={t('settings.favTeam')} value={s.favTeamId ?? ''} onChange={(e) => s.set('favTeamId', e.target.value || null)}>
              <option value="">{t('settings.none')}</option>
              {(lists.data?.c ?? []).map((c) => <option key={c.constructorId} value={c.constructorId}>{c.name}</option>)}
            </MSelect>
            {s.favorites.length > 0 && (
              <div className="row row--wrap">
                {s.favorites.map((f) => (
                  <button key={`${f.kind}:${f.id}`} type="button" className="m3-chip m3-state" onClick={() => s.toggleFavorite(f)} aria-label={`${t('common.removeFav')}: ${f.name}`}>
                    {f.name}<MIcon name="close" size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </MCard>

        <MCard title={t('settings.live')}>
          <Row label={t('settings.autoRefresh')}>
            <MSwitch checked={s.autoRefresh} onChange={(v) => s.set('autoRefresh', v)} label={t('settings.autoRefresh')} />
          </Row>
        </MCard>

        <MCard title={t('settings.notifications')}>
          <p className="note" style={{ marginBottom: 8 }}>{t('settings.notifNote')}</p>
          {NOTIF_KEYS.map((k) => (
            <Row key={k} label={t(`settings.${k}`)}>
              <MSwitch checked={s.notifPrefs[k]} onChange={(v) => s.set('notifPrefs', { ...s.notifPrefs, [k]: v })} label={t(`settings.${k}`)} />
            </Row>
          ))}
        </MCard>

        <MCard title={t('settings.data')}>
          <MButton variant="tonal" icon="delete_sweep" onClick={() => { clearCache(); toast(t('settings.cacheCleared')) }}>{t('settings.clearCache')}</MButton>
          <MDivider />
          <h3 className="m3-title-medium" style={{ margin: '8px 0' }}>{t('settings.sources')}</h3>
          <ul className="m3-list">
            {([
              ['Jolpica F1 API', 'https://github.com/jolpica/jolpica-f1', 'settings.src.jolpica'],
              ['OpenF1', 'https://openf1.org', 'settings.src.openf1'],
              ['f1api.dev', 'https://f1api.dev', 'settings.src.f1api'],
              ['rss2json', 'https://rss2json.com', 'settings.src.news'],
              ['bacinger/f1-circuits', 'https://github.com/bacinger/f1-circuits', 'settings.src.tracks'],
              ['Wikimedia Commons', 'https://commons.wikimedia.org', 'settings.src.images'],
              ['flag-icons', 'https://github.com/lipis/flag-icons', 'settings.src.flags'],
              ['Material Symbols', 'https://fonts.google.com/icons', 'settings.src.icons'],
            ] as const).map(([name, url, key]) => (
              <li key={name} className="m3-list-item" style={{ alignItems: 'flex-start' }}>
                <MIcon name="database" size={20} style={{ marginTop: 2 }} />
                <div className="m3-list-item__main">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="m3-title-small m3-primary-text" style={{ display: 'block' }}>{name}</a>
                  <span className="m3-body-small m3-muted" style={{ whiteSpace: 'normal', display: 'block' }}>{t(key)}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="note row" style={{ alignItems: 'flex-start' }}><MIcon name="info" size={16} />{t('settings.honesty')}</p>
        </MCard>
      </div>
    </div>
  )
}
