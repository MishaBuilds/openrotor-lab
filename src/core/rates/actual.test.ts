import { describe, expect, it } from 'vitest';
import {
  ACTUAL_PARAM_SPECS,
  actualCenterSensitivity,
  actualMaxRate,
  actualModel,
  actualOutputMax,
  actualRateAt,
} from './actual';
import { type RateInputError } from './errors';

/** Betaflight firmware default rate profile, interpreted by the ACTUAL model. */
const DEFAULT_PROFILE = { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 } as const;
/** Same shape with expo, values derived by hand from the published formula. */
const EXPO_PROFILE = { rcRate: 7, expo: 50, srate: 67, rateLimit: 1998 } as const;

function captureError(fn: () => unknown): RateInputError | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error as RateInputError;
  }
}

describe('ACTUAL model: golden values', () => {
  it('reproduces the documented curve of the firmware default profile', () => {
    // centre = 7 * 10 = 70 deg/s, max = 67 * 10 = 670 deg/s, no expo.
    // rate(x) = x * 70 + 600 * (|x| * x)
    expect(actualRateAt(0, DEFAULT_PROFILE)).toBe(0);
    expect(actualRateAt(0.25, DEFAULT_PROFILE)).toBe(55); // 17.5 + 600 * 0.0625
    expect(actualRateAt(0.5, DEFAULT_PROFILE)).toBe(185); // 35 + 600 * 0.25
    expect(actualRateAt(0.75, DEFAULT_PROFILE)).toBe(390); // 52.5 + 600 * 0.5625
    expect(actualRateAt(1, DEFAULT_PROFILE)).toBe(670);
  });

  it('is odd around the stick centre', () => {
    expect(actualRateAt(-0.25, DEFAULT_PROFILE)).toBe(-55);
    expect(actualRateAt(-0.5, DEFAULT_PROFILE)).toBe(-185);
    expect(actualRateAt(-1, DEFAULT_PROFILE)).toBe(-670);
  });

  it('applies expo only to the middle of the curve', () => {
    // shape(0.5) = 0.5 * (0.5^5 * 0.5 + 0.5 * 0.5) = 0.1328125
    expect(actualRateAt(0.25, EXPO_PROFILE)).toBe(36.3232421875);
    expect(actualRateAt(0.5, EXPO_PROFILE)).toBe(114.6875); // 35 + 600 * 0.1328125
    expect(actualRateAt(0.75, EXPO_PROFILE)).toBe(274.6435546875);
    // The ends of the curve do not move with expo.
    expect(actualRateAt(1, EXPO_PROFILE)).toBe(670);
    expect(actualCenterSensitivity(EXPO_PROFILE)).toBe(70);
  });

  it('reports centre sensitivity, maximum and limited output', () => {
    expect(actualCenterSensitivity(DEFAULT_PROFILE)).toBe(70);
    expect(actualMaxRate(DEFAULT_PROFILE)).toBe(670);
    expect(actualOutputMax(DEFAULT_PROFILE)).toBe(670);
  });
});

describe('ACTUAL model: limits', () => {
  const limited = { rcRate: 150, expo: 50, srate: 200, rateLimit: 1000 };

  it('clamps the output to rate_limit', () => {
    expect(actualMaxRate(limited)).toBe(2000); // 1500 centre + 500 headroom
    expect(actualRateAt(1, limited)).toBe(1000);
    expect(actualRateAt(0.75, limited)).toBe(1000);
    expect(actualRateAt(0.5, limited)).toBe(816.40625);
    expect(actualOutputMax(limited)).toBe(1000);
  });

  it('keeps a linear curve when srate is below the centre sensitivity', () => {
    const params = { rcRate: 7, expo: 30, srate: 3, rateLimit: 1998 };
    // headroom = max(0, 30 - 70) = 0, so the curve is purely linear.
    expect(actualRateAt(0.5, params)).toBe(35);
    expect(actualMaxRate(params)).toBe(70);
  });

  it('works with the lowest allowed centre sensitivity', () => {
    const params = { rcRate: 1, expo: 0, srate: 0, rateLimit: 1998 };
    expect(actualRateAt(1, params)).toBe(10);
    expect(actualCenterSensitivity(params)).toBe(10);
    expect(actualMaxRate(params)).toBe(10);
  });
});

describe('ACTUAL model: input handling', () => {
  it('treats out-of-range stick positions as full deflection', () => {
    expect(actualRateAt(2, DEFAULT_PROFILE)).toBe(actualRateAt(1, DEFAULT_PROFILE));
    expect(actualRateAt(-3, DEFAULT_PROFILE)).toBe(actualRateAt(-1, DEFAULT_PROFILE));
  });

  it('rejects non-finite stick positions', () => {
    expect(captureError(() => actualRateAt(Number.NaN, DEFAULT_PROFILE))?.code).toBe(
      'non-finite-deflection',
    );
  });

  it('rejects parameters outside the ACTUAL limits', () => {
    const error = captureError(() => actualRateAt(0.5, { ...DEFAULT_PROFILE, rcRate: 255 }));
    expect(error?.code).toBe('invalid-params');
    expect(error?.issues[0]).toEqual({ key: 'rcRate', code: 'out-of-range', min: 1, max: 200 });

    expect(
      captureError(() => actualCenterSensitivity({ ...DEFAULT_PROFILE, srate: 255 }))?.code,
    ).toBe('invalid-params');
    expect(captureError(() => actualMaxRate({ ...DEFAULT_PROFILE, expo: -5 }))?.code).toBe(
      'invalid-params',
    );
    expect(captureError(() => actualOutputMax({ ...DEFAULT_PROFILE, rateLimit: 10 }))?.code).toBe(
      'invalid-params',
    );
  });

  it('never mutates the parameters it receives', () => {
    const params = Object.freeze({ rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 });
    expect(actualRateAt(0.5, params)).toBe(185);
    expect(params).toEqual({ rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 });
  });

  it('exposes its limits through the model descriptor', () => {
    expect(actualModel.id).toBe('actual');
    expect(actualModel.cliRatesType).toBe('ACTUAL');
    expect(actualModel.params).toBe(ACTUAL_PARAM_SPECS);
    expect(actualModel.params.rateLimit.min).toBe(200);
    expect(actualModel.params.rateLimit.max).toBe(1998);
    expect(actualModel.params.rcRate.editorScale).toBe(10);
  });
});
