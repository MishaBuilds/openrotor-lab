import type { Axis, ParamKey, RateModelId } from '../../core/rates';

/** i18n key of an axis name, e.g. `rate.axis.roll`. */
export function axisLabelKey(axis: Axis): string {
  return `rate.axis.${axis}`;
}

/** i18n key of a model display name, e.g. `rate.model.actual.name`. */
export function modelNameKey(model: RateModelId): string {
  return `rate.model.${model}.name`;
}

/** Label of a parameter, which differs per model (`rc_rate` means different things). */
export function paramLabelKey(model: RateModelId, key: ParamKey): string {
  switch (key) {
    case 'rcRate':
      return `rate.param.rcRate.${model}`;
    case 'expo':
      return 'rate.param.expo';
    case 'srate':
      return `rate.param.srate.${model}`;
    case 'rateLimit':
      return 'rate.param.rateLimit';
  }
}

/** Help text of a parameter, also model specific. */
export function paramHintKey(model: RateModelId, key: ParamKey): string {
  const suffix = model === 'actual' ? 'Actual' : 'Betaflight';
  switch (key) {
    case 'rcRate':
      return `rate.param.hint.rcRate${suffix}`;
    case 'expo':
      return 'rate.param.hint.expo';
    case 'srate':
      return `rate.param.hint.srate${suffix}`;
    case 'rateLimit':
      return 'rate.param.hint.rateLimit';
  }
}

/** CSS custom property holding the accent colour of an axis. */
export function axisColorVar(axis: Axis): string {
  return `var(--${axis})`;
}
