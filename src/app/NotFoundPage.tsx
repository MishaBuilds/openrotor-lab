import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { HOME_REDIRECT } from './routes';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="empty-state">
      <p className="empty-state__title">{t('notFound.title')}</p>
      <p>{t('notFound.description')}</p>
      <Link className="btn btn--primary" href={HOME_REDIRECT}>
        {t('notFound.action')}
      </Link>
    </div>
  );
}
