import { MButton, MEmptyState } from '../design'
import { useSettings } from '../store/settings'

export default function NotFound() {
  const { t } = useSettings()
  return (
    <div className="page">
      <MEmptyState icon="route" title={t('notfound.title')} action={<MButton to="/" icon="home">{t('nav.home')}</MButton>} />
    </div>
  )
}
