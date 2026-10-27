import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESET_BY_MODEL,
  FIRMWARE_DEFAULT_REFERENCE,
  FIRMWARE_RATE_LIMIT_DEFAULT,
  RATE_LIMIT_SPEC,
  RATE_PRESETS,
  getPreset,
} from './constants';
import { AXES } from './types';
import { validateAxisRates } from './validate';

describe('rate presets', () => {
  it('offers a unique preset per entry', () => {
    const ids = RATE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RATE_PRESETS.map((preset) => preset.model)).toEqual(['actual', 'actual', 'betaflight']);
  });

  it('keeps the firmware defaults exactly as the CLI stores them', () => {
    const firmware = getPreset('betaflight-2025-12-default');
    expect(firmware?.model).toBe('actual');
    expect(firmware?.provenance).toBe('betaflight-2025-12-default');
    for (const axis of AXES) {
      expect(firmware?.axes[axis]).toEqual({ rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 });
    }
  });

  it('documents the origin of the defaults and the shared rate limit', () => {
    expect(FIRMWARE_DEFAULT_REFERENCE).toContain('Betaflight');
    expect(FIRMWARE_RATE_LIMIT_DEFAULT).toBe(1998);
    expect(RATE_LIMIT_SPEC.min).toBe(200);
    expect(RATE_LIMIT_SPEC.max).toBe(1998);
    expect(RATE_LIMIT_SPEC.cliName).toBe('rate_limit');
  });

  it('keeps the three axes of a preset independent', () => {
    const preset = getPreset('example-actual-freestyle');
    expect(preset?.axes.roll).not.toBe(preset?.axes.pitch);
    expect(preset?.axes.pitch).not.toBe(preset?.axes.yaw);
  });

  it('resolves presets by id', () => {
    expect(getPreset('example-legacy-race')?.model).toBe('betaflight');
    expect(getPreset('does-not-exist')).toBeUndefined();
  });

  it('maps every model to a preset that is valid for that model', () => {
    for (const model of ['actual', 'betaflight'] as const) {
      const preset = getPreset(DEFAULT_PRESET_BY_MODEL[model]);
      expect(preset?.model).toBe(model);
      expect(preset).toBeDefined();
      if (preset) {
        expect(validateAxisRates(model, preset.axes).ok).toBe(true);
      }
    }
  });
});
