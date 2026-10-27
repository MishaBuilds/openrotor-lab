import { useTranslation } from 'react-i18next';
import { Icon } from '../../app/icons';
import type { CompareSelection } from '../../store/rateStudioStore';

export interface CompareOption {
  readonly id: string;
  readonly label: string;
}

export interface ComparePanelProps {
  readonly options: readonly CompareOption[];
  readonly selection: CompareSelection | null;
  readonly onChange: (sourceId: string) => void;
  readonly onSwap: () => void;
  readonly onClear: () => void;
}

export function ComparePanel({ options, selection, onChange, onSwap, onClear }: ComparePanelProps) {
  const { t } = useTranslation();

  // The active selection can come from a source that is not in the catalogue
  // (a swap makes the current workspace the target, for example). Keep it in
  // the list so the control shows what is actually being compared.
  const entries: readonly CompareOption[] = selection
    ? options.some((option) => option.id === selection.sourceId)
      ? options
      : [...options, { id: selection.sourceId, label: selection.label }]
    : options;

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t('rate.compare.title')}</h2>
        {selection ? <span className="badge badge--accent">{t('rate.compare.on')}</span> : null}
      </div>
      <p className="muted text-sm">{t('rate.compare.hint')}</p>

      <div className="compare-grid" style={{ marginTop: 'var(--space-3)' }}>
        <div className="field">
          <label className="field__label" htmlFor="compare-source">
            {t('rate.compare.source')}
          </label>
          <select
            id="compare-source"
            className="select"
            value={selection?.sourceId ?? ''}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">{t('rate.compare.none')}</option>
            {entries.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {selection ? (
          <div className="row">
            <span className="badge">{selection.label}</span>
            <button type="button" className="btn btn--sm" onClick={onSwap}>
              <Icon name="swap" />
              {t('rate.compare.swap')}
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={onClear}>
              {t('rate.compare.clear')}
            </button>
          </div>
        ) : (
          <p className="faint">{t('rate.compare.none')}</p>
        )}

        {entries.length === 0 ? <p className="faint">{t('rate.compare.noOptions')}</p> : null}
      </div>
    </section>
  );
}
