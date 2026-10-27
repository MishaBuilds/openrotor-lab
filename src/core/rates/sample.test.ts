import { describe, expect, it } from 'vitest';
import { actualModel } from './actual';
import { getPreset } from './constants';
import { DEFAULT_SAMPLE_POINTS, curveDelta, rateTable, sampleCurve } from './sample';
import type { AxisRateParams } from './types';

const DEFAULT_PROFILE: AxisRateParams = { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 };

describe('sampleCurve', () => {
  it('samples the full stick range by default', () => {
    const curve = sampleCurve(actualModel, DEFAULT_PROFILE);
    expect(curve).toHaveLength(DEFAULT_SAMPLE_POINTS);
    expect(curve[0]).toEqual({ deflection: -1, degPerSec: -670 });
    expect(curve[curve.length - 1]).toEqual({ deflection: 1, degPerSec: 670 });
    expect(curve.find((point) => point.deflection === 0)).toEqual({
      deflection: 0,
      degPerSec: 0,
    });
  });

  it('supports custom resolution and windows', () => {
    const curve = sampleCurve(actualModel, DEFAULT_PROFILE, { points: 5, from: 0, to: 1 });
    expect(curve.map((point) => point.deflection)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(curve.map((point) => point.degPerSec)).toEqual([0, 55, 185, 390, 670]);
  });

  it('rejects an invalid sample count', () => {
    expect(() => sampleCurve(actualModel, DEFAULT_PROFILE, { points: 1 })).toThrowError(
      /Sample count/,
    );
    expect(() => sampleCurve(actualModel, DEFAULT_PROFILE, { points: 2.5 })).toThrowError(
      /Sample count/,
    );
  });

  it('rejects an invalid window', () => {
    expect(() => sampleCurve(actualModel, DEFAULT_PROFILE, { from: -1.2 })).toThrowError(
      /Sample window/,
    );
    expect(() => sampleCurve(actualModel, DEFAULT_PROFILE, { to: 1.2 })).toThrowError(
      /Sample window/,
    );
    expect(() => sampleCurve(actualModel, DEFAULT_PROFILE, { from: 0.5, to: 0.5 })).toThrowError(
      /Sample window/,
    );
    expect(() => sampleCurve(actualModel, DEFAULT_PROFILE, { from: Number.NaN })).toThrowError(
      /Sample window/,
    );
    expect(() =>
      sampleCurve(actualModel, DEFAULT_PROFILE, { to: Number.POSITIVE_INFINITY }),
    ).toThrowError(/Sample window/);
  });
});

describe('rateTable', () => {
  it('reports 25/50/75/100 % stick positions by default', () => {
    const table = rateTable(actualModel, DEFAULT_PROFILE);
    expect(table.map((row) => row.deflection)).toEqual([0.25, 0.5, 0.75, 1]);
    expect(table.map((row) => row.degPerSec)).toEqual([55, 185, 390, 670]);
  });

  it('supports custom stops', () => {
    const table = rateTable(actualModel, DEFAULT_PROFILE, [0.1, 1]);
    // 0.1 * 70 + 600 * (0.1 * 0.1) = 7 + 6 = 13
    expect(table[0].degPerSec).toBeCloseTo(13, 10);
    expect(table[1].degPerSec).toBe(670);
  });
});

describe('curveDelta', () => {
  const sharper = getPreset('example-actual-freestyle');
  const stock = getPreset('betaflight-2025-12-default');

  it('computes the point-by-point difference of two curves', () => {
    expect(sharper && stock).toBeTruthy();
    if (!sharper || !stock) {
      return;
    }
    const delta = curveDelta(
      { model: actualModel, params: sharper.axes.roll },
      { model: actualModel, params: stock.axes.roll },
      { points: 5, from: 0, to: 1 },
    );
    // 1100 deg/s max (9/50/110) minus 670 deg/s max (7/0/67).
    expect(delta.map((point) => point.deflection)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(delta[0].degPerSec).toBe(0); // both curves pass through the origin
    // (0.5 * 90 + 1010 * 0.1328125) - 185 = 179.140625 - 185
    expect(delta[2].degPerSec).toBeCloseTo(45 + 1010 * 0.1328125 - 185, 10);
    expect(delta[4].degPerSec).toBe(1100 - 670);
  });

  it('uses the default sampling options when none are given', () => {
    if (!sharper || !stock) {
      return;
    }
    const delta = curveDelta(
      { model: actualModel, params: sharper.axes.roll },
      { model: actualModel, params: stock.axes.roll },
    );
    expect(delta).toHaveLength(DEFAULT_SAMPLE_POINTS);
    expect(delta[delta.length - 1].degPerSec).toBe(430);
  });
});
