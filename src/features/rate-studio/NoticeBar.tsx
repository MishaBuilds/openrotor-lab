import { useTranslation } from 'react-i18next';
import { Icon } from '../../app/icons';
import { useRateStudio } from '../../store/rateStudioStore';

export function NoticeBar() {
  const { t } = useTranslation();
  const notice = useRateStudio((state) => state.notice);
  const notify = useRateStudio((state) => state.notify);

  if (!notice) {
    return null;
  }

  return (
    <div
      className={`notice notice--${notice.tone}`}
      role={notice.tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={notice.tone === 'error' ? 'alert' : 'check'} />
      <div className="notice__body">
        <p className="text-sm">{t(notice.messageKey, notice.values)}</p>
        {notice.detail ? <p className="faint text-xs">{notice.detail}</p> : null}
      </div>
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--icon"
        aria-label={t('common.dismiss')}
        onClick={() => notify(null)}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
