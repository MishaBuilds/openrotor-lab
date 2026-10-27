import { RateInputError } from './errors';
import type { AxisRateParams, RateModel } from './types';

export interface CurvePoint {
  readonly deflection: number;
  readonly degPerSec: number;
}

export interface SampleOptions {
  /** Number of samples, integer >= 2. Defaults to 129. */
  readonly points?: number;
  /** Left end of the window, -1..1. Defaults to -1. */
  readonly from?: number;
  /** Right end of the window, -1..1. Defaults to 1. */
  readonly to?: number;
}

export interface CurveInput {
  readonly model: RateModel;
  readonly params: AxisRateParams;
}

export const DEFAULT_SAMPLE_POINTS = 129;

/** Stick deflections shown in the value table, in % of full stick. */
export const TABLE_STOPS = [0.25, 0.5, 0.75, 1] as const;

export function sampleCurve(
  model: RateModel,
  params: AxisRateParams,
  options: SampleOptions = {},
): CurvePoint[] {
  const points = options.points ?? DEFAULT_SAMPLE_POINTS;
  const from = options.from ?? -1;
  const to = options.to ?? 1;

  if (!Number.isInteger(points) || points < 2) {
    throw new RateInputError(
      'invalid-options',
      `Sample count must be an integer of at least 2, received ${String(points)}.`,
      [],
    );
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < -1 || to > 1 || from >= to) {
    throw new RateInputError(
      'invalid-options',
      `Sample window must satisfy -1 <= from < to <= 1, received ${String(from)}..${String(to)}.`,
      [],
    );
  }

  const curve: CurvePoint[] = [];
  const span = to - from;
  for (let index = 0; index < points; index += 1) {
    const deflection = from + (span * index) / (points - 1);
    curve.push({ deflection, degPerSec: model.rateAt(deflection, params) });
  }
  return curve;
}

/** Rates at the reference stick positions (25/50/75/100 %), in deg/s. */
export function rateTable(
  model: RateModel,
  params: AxisRateParams,
  stops: readonly number[] = TABLE_STOPS,
): CurvePoint[] {
  return stops.map((deflection) => ({
    deflection,
    degPerSec: model.rateAt(deflection, params),
  }));
}

/** Point-by-point difference `a - b` in deg/s, sampled at the deflections of `a`. */
export function curveDelta(
  a: CurveInput,
  b: CurveInput,
  options: SampleOptions = {},
): CurvePoint[] {
  const base = sampleCurve(a.model, a.params, options);
  return base.map((point) => ({
    deflection: point.deflection,
    degPerSec: point.degPerSec - b.model.rateAt(point.deflection, b.params),
  }));
}
