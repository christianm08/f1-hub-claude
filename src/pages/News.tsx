import { useState } from 'react'
import { fetchNews, NEWS_CATEGORIES, FEEDS, type NewsCategory } from '../api/news'
import { useApi } from '../hooks/useApi'
import { useSettings } from '../store/settings'
import { MBadge, MChip, MEmptyState, MIcon, MIconButton } from '../design'
import { Async, PageHead, SkeletonCards, fmtDate, usePageTitle } from '../components/ui'

export default function News() {
  const { t, locale } = useSettings()
  usePageTitle(t('news.title'))
  const [cat, setCat] = useState<NewsCategory>('latest')
  const s = useApi((signal) => fetchNews(signal), [])

  return (
    <div className="page">
      <PageHead
        title={t('news.title')}
        sub={FEEDS.map((f) => f.name).join(' · ')}
        tools={<MIconButton icon="refresh" label={t('common.retry')} variant="tonal" onClick={s.retry} />}
      />
      <div className="m3-chip-row" role="group" aria-label={t('news.title')}>
        {NEWS_CATEGORIES.map((c) => <MChip key={c} selected={cat === c} onClick={() => setCat(c)}>{t(`news.cat.${c}`)}</MChip>)}
      </div>
      <Async state={s} skeleton={<SkeletonCards n={9} h={170} />} isEmpty={(d) => !d.items.length} emptyTitle={t('news.feedDown')} emptyText={t('common.errorHint')}>
        {(d) => {
          const items = d.items.filter((n) => n.categories.includes(cat))
          return (
            <div className="stack">
              {d.failed.length > 0 && <p className="note row"><MIcon name="warning" size={16} />{t('news.feedDown')}: {d.failed.join(', ')}</p>}
              {!items.length ? (
                <MEmptyState icon="newspaper" title={t('common.empty')} />
              ) : (
                <div className="grid grid-cards">
                  {items.map((n) => (
                    <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="m3-card m3-card--link m3-state news-card" aria-label={`${n.title} — ${n.source}`}>
                      <span className="row m3-label-medium m3-muted"><MIcon name="newspaper" size={16} />{n.source}<span className="grow" />{fmtDate(n.date, locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <h2 className="m3-title-medium">{n.title}</h2>
                      {n.excerpt && <p className="m3-body-small">{n.excerpt}</p>}
                      <span className="row row--wrap" style={{ gap: 4, marginTop: 'auto' }}>
                        {n.categories.filter((c) => c !== 'latest').map((c) => <MBadge key={c}>{t(`news.cat.${c}`)}</MBadge>)}
                        <span className="grow" />
                        <span className="row m3-label-medium m3-primary-text" style={{ gap: 4 }}>{t('news.readOn')} {n.source}<MIcon name="open_in_new" size={14} /></span>
                      </span>
                    </a>
                  ))}
                </div>
              )}
              <p className="note">{t('news.disclaimer')}</p>
            </div>
          )
        }}
      </Async>
    </div>
  )
}
