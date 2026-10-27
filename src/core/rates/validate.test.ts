import { describe, expect, it } from 'vitest';
import { RATE_PRESETS, DEFAULT_PRESET_BY_MODEL, FIRMWARE_RATE_LIMIT_DEFAULT } from './constants';
import { validateAxisParams, validateAxisRates } from './validate';

const VALID = { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 };

describe('validateAxisParams', () => {
  it('accepts parameters inside the limits of the model', () => {
    const result = validateAxisParams('actual', VALID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(VALID);
    }
  });

  it('reports every problem with its allowed range', () => {
    const result = validateAxisParams('betaflight', { rcRate: 400, expo: 0, srate: 70 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => [issue.key, issue.code])).toEqual([
        ['rcRate', 'out-of-range'],
        ['rateLimit', 'missing'],
      ]);
      expect(result.issues[0].min).toBe(1);
      expect(result.issues[0].max).toBe(255);
    }
  });
});

describe('validateAxisRates', () => {
  const rates = {
    roll: VALID,
    pitch: { rcRate: 8, expo: 20, srate: 70, rateLimit: 1500 },
    yaw: { rcRate: 10, expo: 0, srate: 55, rateLimit: 1998 },
  };

  it('accepts a complete set of axes', () => {
    const result = validateAxisRates('actual', rates);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pitch.rcRate).toBe(8);
      expect(result.value.roll).toEqual(VALID);
    }
  });

  it('collects problems from every axis with the axis attached', () => {
    const result = validateAxisRates('betaflight', {
      ...rates,
      pitch: { ...rates.pitch, srate: 500 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({ axis: 'pitch', key: 'srate', code: 'out-of-range' });
    }
  });

  it('treats a missing or malformed axes object as four issues per axis', () => {
    const fromNull = validateAxisRates('actual', null);
    expect(fromNull.ok).toBe(false);
    if (!fromNull.ok) {
      expect(fromNull.issues).toHaveLength(12);
      expect(fromNull.issues.filter((issue) => issue.axis === 'yaw')).toHaveLength(4);
    }

    const fromArray = validateAxisRates('actual', []);
    expect(fromArray.ok).toBe(false);
  });

  it('is what the presets are validated with', () => {
    for (const preset of RATE_PRESETS) {
      const result = validateAxisRates(preset.model, preset.axes);
      expect(result.ok).toBe(true);
    }
    expect(FIRMWARE_RATE_LIMIT_DEFAULT).toBe(1998);
    for (const model of ['actual', 'betaflight'] as const) {
      expect(RATE_PRESETS.some((preset) => preset.id === DEFAULT_PRESET_BY_MODEL[model])).toBe(
        true,
      );
    }
  });
});
