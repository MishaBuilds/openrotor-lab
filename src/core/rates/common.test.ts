import { describe, expect, it } from 'vitest';
import { ACTUAL_PARAM_SPECS } from './actual';
import {
  assertParamsValid,
  clampTo,
  collectParamIssues,
  normalizeDeflection,
  normalizeParams,
} from './common';
import { RateInputError } from './errors';

const RANGES = ACTUAL_PARAM_SPECS;
const VALID = { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 };

function captureError(fn: () => unknown): RateInputError | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error as RateInputError;
  }
}

describe('clampTo', () => {
  it('keeps values inside the range and clamps the rest', () => {
    expect(clampTo(-5, 0, 10)).toBe(0);
    expect(clampTo(15, 0, 10)).toBe(10);
    expect(clampTo(3.5, 0, 10)).toBe(3.5);
    expect(clampTo(0, 0, 10)).toBe(0);
    expect(clampTo(10, 0, 10)).toBe(10);
  });
});

describe('normalizeDeflection', () => {
  it('limits the stick position to the receiver range', () => {
    expect(normalizeDeflection(2)).toBe(1);
    expect(normalizeDeflection(-1.7)).toBe(-1);
    expect(normalizeDeflection(0.42)).toBe(0.42);
    expect(normalizeDeflection(-1)).toBe(-1);
    expect(normalizeDeflection(1)).toBe(1);
  });

  it('rejects non-finite stick positions instead of returning NaN', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const error = captureError(() => normalizeDeflection(value));
      expect(error).toBeInstanceOf(RateInputError);
      expect(error?.code).toBe('non-finite-deflection');
    }
  });
});

describe('collectParamIssues', () => {
  it('accepts valid parameters', () => {
    expect(collectParamIssues(RANGES, VALID)).toEqual([]);
    expect(collectParamIssues(RANGES, { ...VALID, rcRate: 1, expo: 100, srate: 200 })).toEqual([]);
  });

  it('reports missing parameters', () => {
    const issues = collectParamIssues(RANGES, { rcRate: 7 });
    expect(issues.map((issue) => issue.key)).toEqual(['expo', 'srate', 'rateLimit']);
    expect(issues.map((issue) => issue.code)).toEqual(['missing', 'missing', 'missing']);
    expect(issues[0]).toEqual({ key: 'expo', code: 'missing', min: 0, max: 100 });
  });

  it('treats null and non-objects as fully missing input', () => {
    expect(collectParamIssues(RANGES, null)).toHaveLength(4);
    expect(collectParamIssues(RANGES, 'nope')).toHaveLength(4);
    expect(collectParamIssues(RANGES, undefined)).toHaveLength(4);
    expect(collectParamIssues(RANGES, 42)).toHaveLength(4);
  });

  it('rejects NaN, Infinity and non-numeric values', () => {
    const issues = collectParamIssues(RANGES, {
      rcRate: Number.NaN,
      expo: 'fifty',
      srate: Number.POSITIVE_INFINITY,
      rateLimit: 1998,
    });
    expect(issues.map((issue) => issue.code)).toEqual(['not-number', 'not-number', 'not-number']);
    expect(issues[2].key).toBe('srate');
  });

  it('rejects non-integer values', () => {
    const issues = collectParamIssues(RANGES, { ...VALID, rcRate: 7.5 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({ key: 'rcRate', code: 'not-integer', min: 1, max: 200 });
  });

  it('reports values below and above the model limits', () => {
    const low = collectParamIssues(RANGES, { ...VALID, rcRate: 0 });
    expect(low[0]).toEqual({ key: 'rcRate', code: 'out-of-range', min: 1, max: 200 });

    const high = collectParamIssues(RANGES, { ...VALID, srate: 201, rateLimit: 5000 });
    expect(high.map((issue) => issue.key)).toEqual(['srate', 'rateLimit']);
    expect(high[1]).toEqual({ key: 'rateLimit', code: 'out-of-range', min: 200, max: 1998 });
  });
});

describe('normalizeParams', () => {
  it('copies the validated values into a fresh object', () => {
    const original = { ...VALID };
    const normalized = normalizeParams(original);
    expect(normalized).toEqual(VALID);
    expect(normalized).not.toBe(original);
  });
});

describe('assertParamsValid', () => {
  it('returns a normalized copy for valid parameters', () => {
    const result = assertParamsValid(RANGES, VALID);
    expect(result).toEqual(VALID);
    expect(result).not.toBe(VALID);
  });

  it('throws invalid-params with the full issue list', () => {
    const error = captureError(() => assertParamsValid(RANGES, { rcRate: 7, expo: -1 }));
    expect(error).toBeInstanceOf(RateInputError);
    expect(error?.code).toBe('invalid-params');
    expect(error?.issues).toHaveLength(3);
    expect(error?.message).toContain('expo: out-of-range (0..100)');
  });
});
