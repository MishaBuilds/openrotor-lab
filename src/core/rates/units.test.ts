import { describe, expect, it } from 'vitest';
import { ACTUAL_PARAM_SPECS } from './actual';
import { BETAFLIGHT_PARAM_SPECS } from './betaflight';
import { RATE_LIMIT_SPEC } from './constants';
import { type RateInputError } from './errors';
import { toEditorValue, toRawValue } from './units';

const actualCentre = ACTUAL_PARAM_SPECS.rcRate;
const legacyCentre = BETAFLIGHT_PARAM_SPECS.rcRate;

function captureError(fn: () => unknown): RateInputError | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error as RateInputError;
  }
}

describe('toEditorValue', () => {
  it('scales ACTUAL deg/s values by 10', () => {
    expect(toEditorValue(actualCentre, 7)).toBe(70);
    expect(toEditorValue(ACTUAL_PARAM_SPECS.srate, 110)).toBe(1100);
  });

  it('keeps legacy CLI values and rate limits unchanged', () => {
    expect(toEditorValue(legacyCentre, 90)).toBe(90);
    expect(toEditorValue(RATE_LIMIT_SPEC, 1998)).toBe(1998);
  });
});

describe('toRawValue', () => {
  it('converts UI values back to CLI integers', () => {
    expect(toRawValue(actualCentre, 70)).toBe(7);
    expect(toRawValue(legacyCentre, 90)).toBe(90);
    expect(toRawValue(RATE_LIMIT_SPEC, 1998)).toBe(1998);
  });

  it('snaps to the nearest stored step', () => {
    expect(toRawValue(actualCentre, 75)).toBe(8);
    expect(toRawValue(actualCentre, 74)).toBe(7);
  });

  it('limits the result to the model range', () => {
    expect(toRawValue(actualCentre, 0)).toBe(1);
    expect(toRawValue(actualCentre, 5000)).toBe(200);
  });

  it('rejects non-finite input', () => {
    expect(captureError(() => toRawValue(actualCentre, Number.NaN))?.code).toBe('invalid-options');
    expect(captureError(() => toRawValue(actualCentre, Number.POSITIVE_INFINITY))?.code).toBe(
      'invalid-options',
    );
  });
});
