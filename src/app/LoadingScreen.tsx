import { useTranslation } from 'react-i18next';

export function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{t('common.loading')}</p>
      <p className="faint">{t('common.loadingHint')}</p>
    </div>
  );
}
