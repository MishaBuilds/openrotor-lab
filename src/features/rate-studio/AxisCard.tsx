import { useTranslation } from 'react-i18next';
import { PARAM_ORDER } from '../../core/rates';
import type { Axis, AxisRateParams, ParamKey, RateModel } from '../../core/rates';
import { ParamControl } from './ParamControl';
import { axisColorVar, axisLabelKey, paramHintKey, paramLabelKey } from './paramMeta';

export interface AxisCardProps {
  readonly axis: Axis;
  readonly model: RateModel;
  readonly params: AxisRateParams;
  readonly visible: boolean;
  readonly onToggleVisible: () => void;
  readonly onParam: (key: ParamKey, editorValue: number) => void;
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  const { t } = useTranslation();
  return (
    <div className="metric">
      <div className="metric__value">
        {Math.round(value)} <span className="text-xs faint">{t('rate.unit')}</span>
      </div>
      <div className="metric__label">{label}</div>
    </div>
  );
}

/** Editors and derived metrics for a single axis of the currently selected model. */
export function AxisCard({
  axis,
  model,
  params,
  visible,
  onToggleVisible,
  onParam,
}: AxisCardProps) {
  const { t } = useTranslation();
  const axisName = t(axisLabelKey(axis));

  return (
    <section className="card">
      <div className="axis-card__head">
        <h3 className="axis-card__title">
          <span
            className={`axis-dot axis-dot--${axis}`}
            style={{ background: axisColorVar(axis) }}
            aria-hidden="true"
          />
          {axisName}
        </h3>
        <button
          type="button"
          className="btn btn--sm"
          aria-pressed={visible}
          onClick={onToggleVisible}
        >
          {visible
            ? t('rate.axis.hidden', { axis: axisName })
            : t('rate.axis.visible', { axis: axisName })}
        </button>
      </div>

      <div className="params">
        {PARAM_ORDER.map((key) => (
          <ParamControl
            key={key}
            spec={model.params[key]}
            value={params[key]}
            cliSetting={`${axis}_${model.params[key].cliName}`}
            label={t(paramLabelKey(model.id, key))}
            hint={t(paramHintKey(model.id, key))}
            onChange={(editorValue) => onParam(key, editorValue)}
          />
        ))}
      </div>

      <div className="metrics">
        <Metric label={t('rate.metrics.center')} value={model.centerSensitivityDegPerSec(params)} />
        <Metric label={t('rate.metrics.max')} value={model.maxRateDegPerSec(params)} />
        <Metric label={t('rate.metrics.limited')} value={model.outputMaxDegPerSec(params)} />
      </div>
    </section>
  );
}
