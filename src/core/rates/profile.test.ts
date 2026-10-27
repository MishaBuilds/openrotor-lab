import { describe, expect, it } from 'vitest';
import {
  PROFILE_NAME_MAX_LENGTH,
  RATE_PROFILE_FORMAT,
  RATE_PROFILE_VERSION,
  createRateProfile,
  parseRateProfile,
  parseRateProfileValue,
  serializeRateProfile,
} from './profile';
import type { ProfileIssue, ProfileParseResult } from './profile';
import type { RateProfile } from './profile';
import type { AxisRates } from './types';

const AXES: AxisRates = {
  roll: { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 },
  pitch: { rcRate: 8, expo: 10, srate: 70, rateLimit: 1500 },
  yaw: { rcRate: 10, expo: 0, srate: 55, rateLimit: 1998 },
};

function expectIssues(
  result: ProfileParseResult,
  expected: readonly ProfileIssue['code'][],
): ProfileIssue[] {
  expect(result.ok).toBe(false);
  if (result.ok) {
    return [];
  }
  expect(result.issues.map((issue) => issue.code)).toEqual([...expected]);
  return [...result.issues];
}

describe('createRateProfile', () => {
  it('fills in defaults for optional metadata', () => {
    const profile = createRateProfile({ name: 'My rates', model: 'actual', axes: AXES });
    expect(profile.format).toBe(RATE_PROFILE_FORMAT);
    expect(profile.version).toBe(RATE_PROFILE_VERSION);
    expect(profile.name).toBe('My rates');
    expect(profile.model).toBe('actual');
    expect(profile.axes).toEqual(AXES);
    expect(profile.createdAt).toBe('');
    expect(profile.presetId).toBeNull();
  });

  it('trims the name and keeps provided metadata', () => {
    const profile = createRateProfile({
      name: '  Race tune  ',
      model: 'betaflight',
      axes: AXES,
      createdAt: '2026-01-01T00:00:00.000Z',
      presetId: 'example-legacy-race',
    });
    expect(profile.name).toBe('Race tune');
    expect(profile.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(profile.presetId).toBe('example-legacy-race');
  });

  it('never stores a name longer than the profile format allows', () => {
    const profile = createRateProfile({
      name: 'x'.repeat(PROFILE_NAME_MAX_LENGTH + 25),
      model: 'actual',
      axes: AXES,
    });
    expect(profile.name).toHaveLength(PROFILE_NAME_MAX_LENGTH);
  });

  it('accepts an explicit null preset id', () => {
    const profile = createRateProfile({
      name: 'Hand tuned',
      model: 'actual',
      axes: AXES,
      presetId: null,
    });
    expect(profile.presetId).toBeNull();
  });
});

describe('serialize / parse round trip', () => {
  it('restores a profile exactly', () => {
    const profile = createRateProfile({
      name: '  Freestyle 90  ',
      model: 'actual',
      axes: AXES,
      createdAt: '2026-02-02T10:11:12.000Z',
      presetId: 'example-actual-freestyle',
    });

    const text = serializeRateProfile(profile);
    expect(text.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(text)).not.toThrow();

    const result = parseRateProfile(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile).toEqual(profile);
    }
  });

  it('round-trips every preset', () => {
    const names = ['one', 'two', 'three'];
    const models = ['actual', 'betaflight', 'actual'] as const;
    for (let index = 0; index < names.length; index += 1) {
      const profile = createRateProfile({
        name: names[index],
        model: models[index],
        axes: AXES,
        createdAt: '2026-03-03T00:00:00.000Z',
      });
      const result = parseRateProfile(serializeRateProfile(profile));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.profile).toEqual(profile);
      }
    }
  });
});

describe('parseRateProfile: malformed documents', () => {
  it('rejects text that is not JSON', () => {
    const issues = expectIssues(parseRateProfile('{ nope'), ['invalid-json']);
    expect(issues[0].path).toBe('$');
    expect(issues[0].message).toContain('not valid JSON');
  });

  it('rejects JSON that is not an object', () => {
    expectIssues(parseRateProfile('[1, 2]'), ['not-an-object']);
    expectIssues(parseRateProfile('42'), ['not-an-object']);
    expectIssues(parseRateProfile('null'), ['not-an-object']);
  });

  it('reports the format and the version it expects', () => {
    const base = { format: 'other/tool', version: 9, name: 'A', model: 'actual', axes: AXES };

    const formatIssues = expectIssues(parseRateProfileValue(base), [
      'unknown-format',
      'unsupported-version',
    ]);
    expect(formatIssues[0].message).toContain(RATE_PROFILE_FORMAT);

    const versionIssues = expectIssues(
      parseRateProfileValue({ ...base, format: RATE_PROFILE_FORMAT }),
      ['unsupported-version'],
    );
    expect(versionIssues[0].message).toContain('9');
  });

  it('validates the profile name', () => {
    const base = { format: RATE_PROFILE_FORMAT, version: 1, model: 'actual', axes: AXES };
    expectIssues(parseRateProfileValue({ ...base, name: '   ' }), ['invalid-name']);
    expectIssues(parseRateProfileValue({ ...base, name: 12 }), ['invalid-name']);
    expectIssues(
      parseRateProfileValue({ ...base, name: 'x'.repeat(PROFILE_NAME_MAX_LENGTH + 1) }),
      ['invalid-name'],
    );
  });

  it('rejects unknown models and explains which ones are supported', () => {
    const issues = expectIssues(
      parseRateProfileValue({
        format: RATE_PROFILE_FORMAT,
        version: 1,
        name: 'A',
        model: 'kiss',
        axes: AXES,
      }),
      ['unknown-model'],
    );
    expect(issues[0].message).toContain('actual');
  });

  it('rejects a document without axes', () => {
    expectIssues(
      parseRateProfileValue({
        format: RATE_PROFILE_FORMAT,
        version: 1,
        name: 'A',
        model: 'actual',
      }),
      ['missing-axes'],
    );
  });

  it('reports parameter problems with their path and allowed range', () => {
    const issues = expectIssues(
      parseRateProfileValue({
        format: RATE_PROFILE_FORMAT,
        version: 1,
        name: 'A',
        model: 'betaflight',
        axes: { ...AXES, roll: { rcRate: 90, expo: 0, srate: 75 } },
      }),
      ['missing'],
    );
    expect(issues[0].path).toBe('axes.roll.rateLimit');
    expect(issues[0].min).toBe(200);
    expect(issues[0].max).toBe(1998);

    expectIssues(
      parseRateProfileValue({
        format: RATE_PROFILE_FORMAT,
        version: 1,
        name: 'A',
        model: 'actual',
        axes: { ...AXES, pitch: { ...AXES.pitch, srate: 900 } },
      }),
      ['out-of-range'],
    );

    expectIssues(
      parseRateProfileValue({
        format: RATE_PROFILE_FORMAT,
        version: 1,
        name: 'A',
        model: 'actual',
        axes: { ...AXES, yaw: { ...AXES.yaw, expo: 'lots' } },
      }),
      ['not-number'],
    );
  });

  it('validates the optional metadata fields', () => {
    const base = {
      format: RATE_PROFILE_FORMAT,
      version: 1,
      name: 'A',
      model: 'actual',
      axes: AXES,
    };

    expectIssues(parseRateProfileValue({ ...base, createdAt: 5 }), ['invalid-createdAt']);
    expectIssues(parseRateProfileValue({ ...base, presetId: 5 }), ['invalid-presetId']);

    const ok = parseRateProfileValue({ ...base, presetId: null, createdAt: '2026-04-04' });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.profile.presetId).toBeNull();
      expect(ok.profile.createdAt).toBe('2026-04-04');
    }

    const withPreset = parseRateProfileValue({ ...base, presetId: 'betaflight-2025-12-default' });
    expect(withPreset.ok).toBe(true);
    if (withPreset.ok) {
      expect(withPreset.profile.presetId).toBe('betaflight-2025-12-default');
    }

    const withoutCreatedAt: RateProfile = {
      ...createRateProfile({ name: 'A', model: 'actual', axes: AXES }),
    };
    const restored = parseRateProfileValue({ ...withoutCreatedAt });
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.profile.createdAt).toBe('');
    }
  });

  it('accumulates several structural problems at once', () => {
    const issues = expectIssues(
      parseRateProfileValue({ format: 'other', version: 3, name: '', model: 'actual', axes: AXES }),
      ['unknown-format', 'unsupported-version', 'invalid-name'],
    );
    expect(issues.map((issue) => issue.path)).toEqual(['format', 'version', 'name']);
    expect(issues.every((issue) => issue.min === null && issue.max === null)).toBe(true);
  });
});
