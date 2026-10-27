import { describe, expect, it } from 'vitest';
import { actualRateAt } from './actual';
import { betaflightRateAt } from './betaflight';
import type { AxisRateParams } from './types';

/**
 * Golden values obtained by an independent transcription of the published
 * formulas (see the numbers spelled out in the comments), not by calling the
 * implementation and copying its output.
 */

interface GoldenCase {
  readonly x: number;
  readonly expected: number;
  /** Number of decimal digits the value is allowed to differ by; null means exact match. */
  readonly precision: number | null;
}

interface GoldenRow {
  readonly params: AxisRateParams;
  readonly label: string;
  readonly cases: readonly GoldenCase[];
}

const exact = (x: number, expected: number): GoldenCase => ({ x, expected, precision: null });
const approx = (x: number, expected: number, precision = 9): GoldenCase => ({
  x,
  expected,
  precision,
});

const ACTUAL_GOLDEN: readonly GoldenRow[] = [
  {
    label: 'ACTUAL firmware default 7/0/67, limit 1998',
    params: { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 },
    cases: [
      exact(0, 0),
      exact(0.25, 55),
      exact(0.5, 185),
      exact(0.75, 390),
      exact(1, 670),
      exact(-0.25, -55),
      exact(-0.75, -390),
    ],
  },
  {
    label: 'ACTUAL with 50 % expo 7/50/67',
    params: { rcRate: 7, expo: 50, srate: 67, rateLimit: 1998 },
    cases: [exact(0, 0), exact(0.25, 36.3232421875), exact(0.5, 114.6875), exact(1, 670)],
  },
  {
    label: 'ACTUAL centre 1500, max 2000, limit 1000',
    params: { rcRate: 150, expo: 50, srate: 200, rateLimit: 1000 },
    cases: [exact(0.25, 390.68603515625), exact(0.5, 816.40625), exact(1, 1000)],
  },
];

const BETAFLIGHT_GOLDEN: readonly GoldenRow[] = [
  {
    label: 'BETAFLIGHT classic 90/0/75, limit 1998',
    params: { rcRate: 90, expo: 0, srate: 75, rateLimit: 1998 },
    cases: [
      exact(0, 0),
      approx(0.25, 720 / 13),
      exact(0.5, 144),
      approx(0.75, 2160 / 7),
      exact(1, 720),
      exact(-0.5, -144),
    ],
  },
  {
    label: 'BETAFLIGHT classic with 50 % expo',
    params: { rcRate: 90, expo: 50, srate: 75, rateLimit: 1998 },
    cases: [approx(0.25, 28.125), exact(0.5, 81), exact(0.75, 219.375), exact(1, 720)],
  },
  {
    label: 'BETAFLIGHT super rate 100 % (denominator limited to 1 %)',
    params: { rcRate: 90, expo: 0, srate: 100, rateLimit: 1998 },
    cases: [exact(0.25, 60), exact(0.5, 180), exact(0.75, 540), exact(1, 1998)],
  },
  {
    label: 'BETAFLIGHT rc_rate 255 with over-crop and rate limit',
    params: { rcRate: 255, expo: 0, srate: 0, rateLimit: 1998 },
    cases: [approx(0.25, 527.35), approx(0.5, 1054.7), exact(1, 1998)],
  },
  {
    label: 'BETAFLIGHT low rc_rate 10, linear',
    params: { rcRate: 10, expo: 0, srate: 0, rateLimit: 1998 },
    cases: [exact(0.25, 5), exact(0.5, 10), exact(0.75, 15), exact(1, 20)],
  },
];

describe('golden values: ACTUAL', () => {
  for (const row of ACTUAL_GOLDEN) {
    it(row.label, () => {
      for (const testCase of row.cases) {
        const value = actualRateAt(testCase.x, row.params);
        if (testCase.precision === null) {
          expect(value).toBe(testCase.expected);
        } else {
          expect(value).toBeCloseTo(testCase.expected, testCase.precision);
        }
      }
    });
  }
});

describe('golden values: BETAFLIGHT', () => {
  for (const row of BETAFLIGHT_GOLDEN) {
    it(row.label, () => {
      for (const testCase of row.cases) {
        const value = betaflightRateAt(testCase.x, row.params);
        if (testCase.precision === null) {
          expect(value).toBe(testCase.expected);
        } else {
          expect(value).toBeCloseTo(testCase.expected, testCase.precision);
        }
      }
    });
  }
});
