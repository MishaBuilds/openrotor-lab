import type { AxisRateParams, AxisRates, ParamKey, ParamSpec, RateModelId } from './types';

/**
 * Limits and defaults taken from the published Betaflight CLI reference
 * (`rate_limit` range 200..1998, default 1998) and from the firmware default
 * rate profile of the Betaflight 2025.12 release.
 */
export const RATE_LIMIT_SPEC: ParamSpec = {
  key: 'rateLimit',
  cliName: 'rate_limit',
  min: 200,
  max: 1998,
  step: 1,
  unit: 'deg/s',
  editorScale: 1,
};

export const FIRMWARE_RATE_LIMIT_DEFAULT = 1998;

/** Free-form origin of preset values; the UI renders a translated explanation for each. */
export type PresetProvenance = 'betaflight-2025-12-default' | 'example-actual' | 'example-legacy';

export interface RatePreset {
  readonly id: string;
  readonly model: RateModelId;
  readonly axes: AxisRates;
  readonly provenance: PresetProvenance;
}

function axis(rcRate: number, expo: number, srate: number): AxisRateParams {
  return { rcRate, expo, srate, rateLimit: FIRMWARE_RATE_LIMIT_DEFAULT };
}

function allAxes(params: AxisRateParams): AxisRates {
  // Fresh objects per axis: axes must stay independent from each other.
  return { roll: { ...params }, pitch: { ...params }, yaw: { ...params } };
}

/** Axes of the Betaflight firmware default rate profile (rates_type = ACTUAL). */
export const FIRMWARE_DEFAULT_AXES = allAxes(axis(7, 0, 67));

/**
 * Presets offered by the UI. Only implemented models appear here, and every
 * entry carries the origin of its values so that a reset can explain itself.
 */
export const RATE_PRESETS: readonly RatePreset[] = [
  {
    id: 'betaflight-2025-12-default',
    model: 'actual',
    provenance: 'betaflight-2025-12-default',
    axes: FIRMWARE_DEFAULT_AXES,
  },
  {
    id: 'example-actual-freestyle',
    model: 'actual',
    provenance: 'example-actual',
    axes: {
      roll: axis(9, 50, 110),
      pitch: axis(9, 50, 110),
      yaw: axis(10, 40, 100),
    },
  },
  {
    id: 'example-legacy-race',
    model: 'betaflight',
    provenance: 'example-legacy',
    axes: allAxes(axis(90, 0, 70)),
  },
];

/** Preset applied by "reset to defaults" for the model that is currently selected. */
export const DEFAULT_PRESET_BY_MODEL: Readonly<Record<RateModelId, string>> = {
  actual: 'betaflight-2025-12-default',
  betaflight: 'example-legacy-race',
};

export function getPreset(id: string): RatePreset | undefined {
  return RATE_PRESETS.find((preset) => preset.id === id);
}

/** Documented origin of the firmware default values, shown next to a reset. */
export const FIRMWARE_DEFAULT_REFERENCE = 'Betaflight 2025.12 default rate profile';

/** Parameter keys in CLI order, used when rendering editors. */
export const PARAM_ORDER: readonly ParamKey[] = ['rcRate', 'expo', 'srate', 'rateLimit'];
