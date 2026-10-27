import { useTranslation } from 'react-i18next';
import { Icon } from '../../app/icons';
import { RATE_PRESETS } from '../../core/rates';
import { useRateStudio } from '../../store/rateStudioStore';
import { modelNameKey } from './paramMeta';

/**
 * Preset catalogue plus the reset button. Every preset carries the origin of
 * its numbers so a reset can explain what it restored.
 */
export function PresetPanel() {
  const { t } = useTranslation();
  const activePresetId = useRateStudio((state) => state.activePresetId);
  const applyPreset = useRateStudio((state) => state.applyPreset);
  const resetToDefaults = useRateStudio((state) => state.resetToDefaults);

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t('rate.presets.title')}</h2>
      </div>
      <p className="muted text-sm">{t('rate.presets.hint')}</p>

      <div className="preset-list" style={{ marginTop: 'var(--space-3)' }}>
        {RATE_PRESETS.map((preset) => {
          const active = preset.id === activePresetId;
          return (
            <div className="preset" key={preset.id} data-active={active}>
              <div className="preset__body">
                <span className="preset__name">{t(`rate.presets.name.${preset.id}`)}</span>
                <span className="faint text-sm">{t(modelNameKey(preset.model))}</span>
                <span className="faint text-xs">
                  {t(`rate.presets.provenance.${preset.provenance}`)}
                </span>
              </div>
              <button type="button" className="btn btn--sm" onClick={() => applyPreset(preset.id)}>
                {active ? <Icon name="check" /> : null}
                {active ? t('rate.presets.active') : t('rate.presets.load')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="stack-sm" style={{ marginTop: 'var(--space-4)' }}>
        <p className="card__title">{t('rate.reset.title')}</p>
        <p className="faint">{t('rate.reset.body')}</p>
        <div>
          <button type="button" className="btn btn--primary" onClick={resetToDefaults}>
            <Icon name="reset" />
            {t('rate.reset.button')}
          </button>
        </div>
      </div>
    </section>
  );
}
