import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../app/icons';
import { AXIS_ORDER, useRateStudio } from '../../store/rateStudioStore';
import type { AxisRates } from '../../core/rates';

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}

function summarize(rates: AxisRates): string {
  return AXIS_ORDER.map((axis) => {
    const params = rates[axis];
    return `${axis.slice(0, 1).toUpperCase()}:${params.rcRate}/${params.expo}/${params.srate}`;
  }).join('  ');
}

/**
 * Local-only storage of whole tunes. Nothing is uploaded: the list lives in
 * this browser's localStorage and can be cleared at any time.
 */
export function SavedProfiles() {
  const { t } = useTranslation();
  const savedProfiles = useRateStudio((state) => state.savedProfiles);
  const saveProfile = useRateStudio((state) => state.saveProfile);
  const loadSaved = useRateStudio((state) => state.loadSaved);
  const deleteSaved = useRateStudio((state) => state.deleteSaved);
  const setCompare = useRateStudio((state) => state.setCompare);
  const setProfileName = useRateStudio((state) => state.setProfileName);
  const model = useRateStudio((state) => state.model);
  const axes = useRateStudio((state) => state.axes);
  const profileName = useRateStudio((state) => state.profileName);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const summary = useMemo(() => summarize(axes), [axes]);

  const handleSave = () => {
    const ok = saveProfile(profileName, model, axes);
    setLastSaved(ok ? profileName.trim() : null);
  };

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t('rate.profiles.title')}</h2>
        <span className="badge">{t('rate.profiles.count', { count: savedProfiles.length })}</span>
      </div>

      <p className="muted text-sm">{t('rate.profiles.storageNote')}</p>

      <div className="row" style={{ margin: 'var(--space-3) 0' }}>
        <button type="button" className="btn btn--primary" onClick={handleSave}>
          <Icon name="save" />
          {t('rate.profiles.save')}
        </button>
        {lastSaved ? (
          <span className="badge badge--ok">
            {t('rate.profiles.savedBadge', { name: lastSaved })}
          </span>
        ) : null}
      </div>

      <p className="mono faint text-xs" style={{ marginBottom: 'var(--space-3)' }}>
        {summary}
      </p>

      {savedProfiles.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">{t('rate.profiles.emptyTitle')}</p>
          <p>{t('rate.profiles.empty')}</p>
        </div>
      ) : (
        <ul className="profile-list">
          {savedProfiles.map((record) => (
            <li className="profile-item" key={record.id}>
              <div className="profile-item__body">
                <span className="profile-item__name">{record.profile.name}</span>
                <span className="profile-item__meta">
                  {t(`rate.model.${record.profile.model}.name`)} ·{' '}
                  {t('rate.profiles.savedAt', { date: formatDate(record.savedAt) })}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  loadSaved(record.id);
                  setProfileName(record.profile.name);
                }}
                aria-label={`${t('rate.profiles.load')}: ${record.profile.name}`}
              >
                {t('rate.profiles.load')}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  setCompare({
                    sourceId: `saved:${record.id}`,
                    label: record.profile.name,
                    model: record.profile.model,
                    axes: {
                      roll: { ...record.profile.axes.roll },
                      pitch: { ...record.profile.axes.pitch },
                      yaw: { ...record.profile.axes.yaw },
                    },
                  })
                }
                aria-label={`${t('rate.compare.action')}: ${record.profile.name}`}
              >
                {t('rate.compare.action')}
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger btn--icon"
                onClick={() => deleteSaved(record.id)}
                aria-label={`${t('rate.profiles.delete')}: ${record.profile.name}`}
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="faint text-xs" style={{ marginTop: 'var(--space-2)' }}>
        {t('rate.profiles.compareHint')}
      </p>
    </section>
  );
}
