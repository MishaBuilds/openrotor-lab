import { useTranslation } from 'react-i18next';

interface PlannedModulePageProps {
  /** i18n prefix of this module's copy, e.g. `planned.blackboxLab`. */
  readonly contentKey: string;
}

export function PlannedModulePage({ contentKey }: PlannedModulePageProps) {
  const { t } = useTranslation();
  const points = t(`${contentKey}.points`, { returnObjects: true }) as unknown as string[];

  return (
    <div className="planned">
      <div className="page-header">
        <div className="page-header__text stack-sm">
          <div className="row">
            <h1>{t(`${contentKey}.title`)}</h1>
            <span className="badge badge--warn">{t('planned.common.badge')}</span>
          </div>
          <p className="muted">{t(`${contentKey}.desc`)}</p>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">{t('planned.common.willDo')}</h2>
        </div>
        <ul className="planned__points">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <p className="muted text-sm">{t('planned.common.lead')}</p>
    </div>
  );
}
