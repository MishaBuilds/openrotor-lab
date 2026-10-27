import { RateInputError } from './errors';
import type { AxisRateParams, ParamIssue, ParamKey, ParamRange } from './types';
import { PARAM_KEYS } from './types';

export const DEFLECTION_MIN = -1;
export const DEFLECTION_MAX = 1;

export function clampTo(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * Receiver endpoints are treated exactly like the firmware treats them: the
 * stick position is limited to [-1, 1], while non-finite input is a programming
 * error and therefore rejected.
 */
export function normalizeDeflection(deflection: number): number {
  if (!Number.isFinite(deflection)) {
    throw new RateInputError(
      'non-finite-deflection',
      `Stick deflection must be a finite number, received ${String(deflection)}.`,
      [],
    );
  }
  return clampTo(deflection, DEFLECTION_MIN, DEFLECTION_MAX);
}

/**
 * Checks raw CLI parameters against the limits of a model and returns every
 * problem found. All rates parameters are integers with a step of 1, so no
 * additional stepping rule is required.
 */
export function collectParamIssues(
  ranges: Readonly<Record<ParamKey, ParamRange>>,
  params: unknown,
): ParamIssue[] {
  const issues: ParamIssue[] = [];
  const source = (typeof params === 'object' && params !== null ? params : {}) as Record<
    string,
    unknown
  >;

  for (const key of PARAM_KEYS) {
    const range = ranges[key];
    const value = source[key];
    const bounds = { key, min: range.min, max: range.max };

    if (value === undefined || value === null) {
      issues.push({ ...bounds, code: 'missing' });
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({ ...bounds, code: 'not-number' });
      continue;
    }
    if (!Number.isInteger(value)) {
      issues.push({ ...bounds, code: 'not-integer' });
      continue;
    }
    if (value < range.min || value > range.max) {
      issues.push({ ...bounds, code: 'out-of-range' });
    }
  }

  return issues;
}

function describeIssues(issues: readonly ParamIssue[]): string {
  return issues
    .map((issue) => `${issue.key}: ${issue.code} (${issue.min}..${issue.max})`)
    .join('; ');
}

/** Re-orders the validated values into a fresh, fully typed object. */
export function normalizeParams(params: unknown): AxisRateParams {
  const source = params as Record<string, unknown>;
  return {
    rcRate: source.rcRate as number,
    expo: source.expo as number,
    srate: source.srate as number,
    rateLimit: source.rateLimit as number,
  };
}

/** Throws `invalid-params` when any parameter is missing or out of range. */
export function assertParamsValid(
  ranges: Readonly<Record<ParamKey, ParamRange>>,
  params: unknown,
): AxisRateParams {
  const issues = collectParamIssues(ranges, params);
  if (issues.length > 0) {
    throw new RateInputError('invalid-params', describeIssues(issues), issues);
  }
  return normalizeParams(params);
}
