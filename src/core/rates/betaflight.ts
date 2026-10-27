import { assertParamsValid, clampTo, normalizeDeflection } from './common';
import { RATE_LIMIT_SPEC } from './constants';
import type { AxisRateParams, ParamKey, ParamSpec, RateModel } from './types';

/**
 * Classic Betaflight rates (Betaflight `rates_type = BETAFLIGHT`).
 *
 * Published specification:
 *  - `rc_rate` is a multiplier divided by 100; values above 200 follow the
 *    documented over-crop rule `rcRate += 14.54 * (rcRate - 2)`;
 *  - `expo` (0..100) blends `x * |x|^3` with the linear stick position;
 *  - `srate` (super rate, 0..100) applies `1 / clamp(1 - |x| * srate / 100, 0.01, 1)`;
 *  - the result is clamped to the per-axis `rate_limit`.
 *
 * Limits come from the firmware `ratesSettingLimits` for BETAFLIGHT:
 * rc_rate <= 255, srate <= 100, expo <= 100.
 */
export const BETAFLIGHT_PARAM_SPECS: Readonly<Record<ParamKey, ParamSpec>> = {
  rcRate: {
    key: 'rcRate',
    cliName: 'rc_rate',
    min: 1,
    max: 255,
    step: 1,
    unit: '',
    editorScale: 1,
  },
  expo: { key: 'expo', cliName: 'expo', min: 0, max: 100, step: 1, unit: '%', editorScale: 1 },
  srate: { key: 'srate', cliName: 'srate', min: 0, max: 100, step: 1, unit: '%', editorScale: 1 },
  rateLimit: RATE_LIMIT_SPEC,
};

const RC_RATE_OVERCROP_START = 2;
const RC_RATE_OVERCROP_SLOPE = 14.54;
const SUPER_RATE_MIN_DENOMINATOR = 0.01;

/** Documented over-crop applied to RC Rate values above 2.00. */
export function betaflightEffectiveRcRate(rcRateRaw: number): number {
  const rcRate = rcRateRaw / 100;
  if (rcRate > RC_RATE_OVERCROP_START) {
    return rcRate + RC_RATE_OVERCROP_SLOPE * (rcRate - RC_RATE_OVERCROP_START);
  }
  return rcRate;
}

function expoShaped(x: number, expoPercent: number): number {
  if (expoPercent === 0) {
    return x;
  }
  const expo = expoPercent / 100;
  return x * Math.abs(x) ** 3 * expo + x * (1 - expo);
}

/** Rate before the `rate_limit` clamp; `x` is expected to be normalised already. */
function rawRate(x: number, params: AxisRateParams): number {
  const angle = 200 * betaflightEffectiveRcRate(params.rcRate) * expoShaped(x, params.expo);
  if (params.srate === 0) {
    return angle;
  }
  const denominator = clampTo(
    1 - Math.abs(x) * (params.srate / 100),
    SUPER_RATE_MIN_DENOMINATOR,
    1,
  );
  const superRateFactor = 1 / denominator;
  return angle * superRateFactor;
}

export function betaflightRateAt(deflection: number, params: AxisRateParams): number {
  const valid = assertParamsValid(BETAFLIGHT_PARAM_SPECS, params);
  const x = normalizeDeflection(deflection);
  return clampTo(rawRate(x, valid), -valid.rateLimit, valid.rateLimit);
}

export function betaflightCenterSensitivity(params: AxisRateParams): number {
  const valid = assertParamsValid(BETAFLIGHT_PARAM_SPECS, params);
  // Slope of the expo blend at x = 0 is (1 - expo), super factor is 1 at centre.
  return 200 * betaflightEffectiveRcRate(valid.rcRate) * (1 - valid.expo / 100);
}

export function betaflightMaxRate(params: AxisRateParams): number {
  const valid = assertParamsValid(BETAFLIGHT_PARAM_SPECS, params);
  return Math.abs(rawRate(1, valid));
}

export function betaflightOutputMax(params: AxisRateParams): number {
  const valid = assertParamsValid(BETAFLIGHT_PARAM_SPECS, params);
  return Math.min(Math.abs(rawRate(1, valid)), valid.rateLimit);
}

export const betaflightModel: RateModel = {
  id: 'betaflight',
  cliRatesType: 'BETAFLIGHT',
  params: BETAFLIGHT_PARAM_SPECS,
  rateAt: betaflightRateAt,
  centerSensitivityDegPerSec: betaflightCenterSensitivity,
  maxRateDegPerSec: betaflightMaxRate,
  outputMaxDegPerSec: betaflightOutputMax,
};
