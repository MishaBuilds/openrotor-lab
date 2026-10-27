import { useTranslation } from 'react-i18next';
import { PENDING_MODELS, RATE_MODELS, getRateModel } from '../../core/rates';
import { useRateStudio } from '../../store/rateStudioStore';
import { modelNameKey } from './paramMeta';

/**
 * Model switcher. Only models that are actually implemented are selectable;
 * the rest are listed as unavailable rather than silently approximated.
 */
export function ModelPicker() {
  const { t } = useTranslation();
  const modelId = useRateStudio((state) => state.model);
  const setModel = useRateStudio((state) => state.setModel);
  const activeModel = getRateModel(modelId);

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t('rate.model.title')}</h2>
        <span className="badge badge--accent">
          {t('rate.model.ratesType', { value: activeModel.cliRatesType })}
        </span>
      </div>
      <p className="muted text-sm">{t('rate.model.help')}</p>

      <div className="model-grid" style={{ marginTop: 'var(--space-3)' }}>
        {RATE_MODELS.map((entry) => {
          const active = entry.id === modelId;
          return (
            <button
              key={entry.id}
              type="button"
              className="model-card"
              aria-pressed={active}
              onClick={() => setModel(entry.id)}
            >
              <span className="model-card__name">
                {t(modelNameKey(entry.id))}
                {active ? (
                  <span className="badge badge--accent">{t('rate.model.active')}</span>
                ) : null}
              </span>
              <span className="model-card__desc">{t(`rate.model.${entry.id}.desc`)}</span>
              <span className="model-card__desc mono text-xs">
                {t('rate.model.ratesType', { value: entry.cliRatesType })}
              </span>
            </button>
          );
        })}

        {PENDING_MODELS.map((name) => (
          <div key={name} className="model-card model-card--pending" aria-disabled="true">
            <span className="model-card__name">
              {name}
              <span className="badge badge--warn">{t('rate.model.pending')}</span>
            </span>
            <span className="model-card__desc">{t('rate.model.pendingHelp')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
