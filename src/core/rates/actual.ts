import { assertParamsValid, clampTo, normalizeDeflection } from './common';
import { RATE_LIMIT_SPEC } from './constants';
import type { AxisRateParams, ParamKey, ParamSpec, RateModel } from './types';

/**
 * ACTUAL rates (Betaflight `rates_type = ACTUAL`).
 *
 * Published specification (Betaflight CLI reference):
 *  - `rc_rate` holds the sensitivity at stick centre in deg/s divided by 10;
 *  - `srate` holds the maximum rate at full deflection in deg/s divided by 10;
 *  - `expo` (0..100) reshapes the middle of the curve without moving either end.
 *
 * Model: rate(x) = x * centre + max(0, maxRate - centre) * shape(x),
 * where shape(x) = |x| * (x^5 * expo + x * (1 - expo)),
 * followed by the per-axis `rate_limit` clamp.
 *
 * Limits come from the firmware `ratesSettingLimits` for ACTUAL:
 * rc_rate <= 200, srate <= 200, expo <= 100.
 */
export const ACTUAL_PARAM_SPECS: Readonly<Record<ParamKey, ParamSpec>> = {
  rcRate: {
    key: 'rcRate',
    cliName: 'rc_rate',
    min: 1,
    max: 200,
    step: 1,
    unit: 'deg/s',
    editorScale: 10,
  },
  expo: { key: 'expo', cliName: 'expo', min: 0, max: 100, step: 1, unit: '%', editorScale: 1 },
  srate: {
    key: 'srate',
    cliName: 'srate',
    min: 0,
    max: 200,
    step: 1,
    unit: 'deg/s',
    editorScale: 10,
  },
  rateLimit: RATE_LIMIT_SPEC,
};

function expoShape(x: number, expoPercent: number): number {
  const expo = expoPercent / 100;
  return Math.abs(x) * (x ** 5 * expo + x * (1 - expo));
}

/** Rate before the `rate_limit` clamp; `x` is expected to be normalised already. */
function rawRate(x: number, params: AxisRateParams): number {
  const centre = params.rcRate * 10;
  const maxRate = params.srate * 10;
  const headroom = Math.max(0, maxRate - centre);
  return x * centre + headroom * expoShape(x, params.expo);
}

export function actualRateAt(deflection: number, params: AxisRateParams): number {
  const valid = assertParamsValid(ACTUAL_PARAM_SPECS, params);
  const x = normalizeDeflection(deflection);
  return clampTo(rawRate(x, valid), -valid.rateLimit, valid.rateLimit);
}

export function actualCenterSensitivity(params: AxisRateParams): number {
  const valid = assertParamsValid(ACTUAL_PARAM_SPECS, params);
  // The expo term is O(x^2) around zero, so the slope at centre is just `centre`.
  return valid.rcRate * 10;
}

export function actualMaxRate(params: AxisRateParams): number {
  const valid = assertParamsValid(ACTUAL_PARAM_SPECS, params);
  return Math.abs(rawRate(1, valid));
}

export function actualOutputMax(params: AxisRateParams): number {
  const valid = assertParamsValid(ACTUAL_PARAM_SPECS, params);
  return Math.min(Math.abs(rawRate(1, valid)), valid.rateLimit);
}

export const actualModel: RateModel = {
  id: 'actual',
  cliRatesType: 'ACTUAL',
  params: ACTUAL_PARAM_SPECS,
  rateAt: actualRateAt,
  centerSensitivityDegPerSec: actualCenterSensitivity,
  maxRateDegPerSec: actualMaxRate,
  outputMaxDegPerSec: actualOutputMax,
};
