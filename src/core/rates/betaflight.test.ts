import { describe, expect, it } from 'vitest';
import {
  BETAFLIGHT_PARAM_SPECS,
  betaflightCenterSensitivity,
  betaflightEffectiveRcRate,
  betaflightMaxRate,
  betaflightModel,
  betaflightOutputMax,
  betaflightRateAt,
} from './betaflight';
import { type RateInputError } from './errors';

/** Classic legacy rates: rc_rate 90, no expo, super rate 75 -> 180 deg/s centre, 720 deg/s max. */
const RACE_PROFILE = { rcRate: 90, expo: 0, srate: 75, rateLimit: 1998 } as const;
/** The same profile with 50 % expo. */
const RACE_EXPO_PROFILE = { rcRate: 90, expo: 50, srate: 75, rateLimit: 1998 } as const;

function captureError(fn: () => unknown): RateInputError | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error as RateInputError;
  }
}

describe('BETAFLIGHT model: golden values', () => {
  it('reproduces the classic 90/0/75 curve', () => {
    expect(betaflightRateAt(0, RACE_PROFILE)).toBe(0);
    // 200 * 0.9 * 0.25 / (1 - 0.25 * 0.75) = 45 / 0.8125 = 720/13
    expect(betaflightRateAt(0.25, RACE_PROFILE)).toBeCloseTo(720 / 13, 10);
    expect(betaflightRateAt(0.5, RACE_PROFILE)).toBe(144); // 90 / 0.625
    // 200 * 0.9 * 0.75 / (1 - 0.75 * 0.75) = 135 / 0.4375 = 2160/7
    expect(betaflightRateAt(0.75, RACE_PROFILE)).toBeCloseTo(2160 / 7, 10);
    expect(betaflightRateAt(1, RACE_PROFILE)).toBe(720); // 180 / 0.25
  });

  it('is odd around the stick centre', () => {
    expect(betaflightRateAt(-0.5, RACE_PROFILE)).toBe(-144);
    expect(betaflightRateAt(-1, RACE_PROFILE)).toBe(-720);
  });

  it('applies expo to the middle and leaves the ends in place', () => {
    // shaped(0.25) = 0.25 * 0.25^3 * 0.5 + 0.25 * 0.5 = 0.126953125
    expect(betaflightRateAt(0.25, RACE_EXPO_PROFILE)).toBeCloseTo(28.125, 10);
    // shaped(0.5) = 0.5 * 0.5^3 * 0.5 + 0.5 * 0.5 = 0.28125 -> 50.625 / 0.625
    expect(betaflightRateAt(0.5, RACE_EXPO_PROFILE)).toBe(81);
    expect(betaflightRateAt(0.75, RACE_EXPO_PROFILE)).toBe(219.375);
    expect(betaflightRateAt(1, RACE_EXPO_PROFILE)).toBe(720);
    expect(betaflightCenterSensitivity(RACE_EXPO_PROFILE)).toBe(90);
  });

  it('reports centre sensitivity and maximum of the classic profile', () => {
    expect(betaflightCenterSensitivity(RACE_PROFILE)).toBe(180);
    expect(betaflightMaxRate(RACE_PROFILE)).toBe(720);
    expect(betaflightOutputMax(RACE_PROFILE)).toBe(720);
  });
});

describe('BETAFLIGHT model: RC Rate behaviour', () => {
  it('is linear while rc_rate stays at or below 200', () => {
    const params = { rcRate: 10, expo: 0, srate: 0, rateLimit: 1998 };
    expect(betaflightRateAt(0.5, params)).toBe(10);
    expect(betaflightRateAt(1, params)).toBe(20);
    expect(betaflightCenterSensitivity(params)).toBe(20);
    expect(betaflightEffectiveRcRate(200)).toBe(2);
  });

  it('applies the documented over-crop above rc_rate 200', () => {
    // 2.55 + 14.54 * 0.55 = 10.547
    expect(betaflightEffectiveRcRate(255)).toBeCloseTo(10.547, 10);
    expect(betaflightEffectiveRcRate(201)).toBeCloseTo(2.01 + 14.54 * 0.01, 10);
    expect(betaflightEffectiveRcRate(90)).toBe(0.9);

    const params = { rcRate: 255, expo: 0, srate: 0, rateLimit: 1998 };
    expect(betaflightRateAt(0.5, params)).toBeCloseTo(1054.7, 6);
    expect(betaflightCenterSensitivity(params)).toBeCloseTo(2109.4, 6);
    expect(betaflightMaxRate(params)).toBeCloseTo(2109.4, 6);
  });
});

describe('BETAFLIGHT model: limits', () => {
  it('clamps the output to rate_limit', () => {
    const params = { rcRate: 255, expo: 0, srate: 0, rateLimit: 1998 };
    expect(betaflightRateAt(1, params)).toBe(1998);
    expect(betaflightOutputMax(params)).toBe(1998);
  });

  it('limits the super factor denominator to 1 % of stick travel', () => {
    // srate 100 at full deflection would be an infinite rate: the firmware clamps
    // the denominator to 0.01 and the result is then limited by rate_limit.
    const params = { rcRate: 90, expo: 0, srate: 100, rateLimit: 1998 };
    expect(betaflightRateAt(0.5, params)).toBe(180); // 90 / 0.5
    expect(betaflightRateAt(1, params)).toBe(1998);
    expect(betaflightMaxRate(params)).toBe(18000);
    expect(betaflightOutputMax(params)).toBe(1998);
  });
});

describe('BETAFLIGHT model: input handling', () => {
  it('treats out-of-range stick positions as full deflection', () => {
    expect(betaflightRateAt(5, RACE_PROFILE)).toBe(betaflightRateAt(1, RACE_PROFILE));
    expect(betaflightRateAt(-2, RACE_PROFILE)).toBe(betaflightRateAt(-1, RACE_PROFILE));
  });

  it('rejects non-finite stick positions', () => {
    expect(captureError(() => betaflightRateAt(Number.NaN, RACE_PROFILE))?.code).toBe(
      'non-finite-deflection',
    );
  });

  it('rejects parameters outside the BETAFLIGHT limits', () => {
    // The legacy model allows super rates only up to 100 %, unlike ACTUAL.
    const error = captureError(() => betaflightRateAt(0.5, { ...RACE_PROFILE, srate: 150 }));
    expect(error?.code).toBe('invalid-params');
    expect(error?.issues[0]).toEqual({ key: 'srate', code: 'out-of-range', min: 0, max: 100 });

    expect(captureError(() => betaflightRateAt(0.5, { ...RACE_PROFILE, rcRate: 0 }))?.code).toBe(
      'invalid-params',
    );
    expect(
      captureError(() => betaflightCenterSensitivity({ ...RACE_PROFILE, expo: 101 }))?.code,
    ).toBe('invalid-params');
    expect(captureError(() => betaflightMaxRate({ ...RACE_PROFILE, rateLimit: 50 }))?.code).toBe(
      'invalid-params',
    );
    expect(
      captureError(() => betaflightOutputMax({ ...RACE_PROFILE, rcRate: Number.NaN }))?.code,
    ).toBe('invalid-params');
  });

  it('never mutates the parameters it receives', () => {
    const params = Object.freeze({ rcRate: 90, expo: 0, srate: 75, rateLimit: 1998 });
    expect(betaflightRateAt(0.5, params)).toBe(144);
    expect(params).toEqual({ rcRate: 90, expo: 0, srate: 75, rateLimit: 1998 });
  });

  it('exposes its limits through the model descriptor', () => {
    expect(betaflightModel.id).toBe('betaflight');
    expect(betaflightModel.cliRatesType).toBe('BETAFLIGHT');
    expect(betaflightModel.params).toBe(BETAFLIGHT_PARAM_SPECS);
    expect(betaflightModel.params.rcRate.max).toBe(255);
    expect(betaflightModel.params.rcRate.editorScale).toBe(1);
    expect(betaflightModel.params.srate.max).toBe(100);
  });
});
