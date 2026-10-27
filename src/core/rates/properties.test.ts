import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RATE_MODELS, curveDelta, rateTable, sampleCurve, validateAxisRates } from './index';
import type { AxisRateParams, RateModel } from './types';

const paramsArb = (model: RateModel) =>
  fc.record({
    rcRate: fc.integer({ min: model.params.rcRate.min, max: model.params.rcRate.max }),
    expo: fc.integer({ min: model.params.expo.min, max: model.params.expo.max }),
    srate: fc.integer({ min: model.params.srate.min, max: model.params.srate.max }),
    rateLimit: fc.integer({ min: model.params.rateLimit.min, max: model.params.rateLimit.max }),
  });

const axesArb = (model: RateModel) =>
  fc.record({
    roll: paramsArb(model),
    pitch: paramsArb(model),
    yaw: paramsArb(model),
  });

const deflectionArb = fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true });

function isClose(actual: number, expected: number, epsilon = 1e-9): boolean {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  return Math.abs(actual - expected) <= epsilon * scale;
}

describe('rate curve properties', () => {
  for (const model of RATE_MODELS) {
    describe(model.id, () => {
      const params = paramsArb(model);

      it('passes through the origin', () => {
        fc.assert(
          fc.property(params, (p: AxisRateParams) => {
            expect(model.rateAt(0, p)).toBe(0);
          }),
        );
      });

      it('is odd around the stick centre', () => {
        fc.assert(
          fc.property(params, deflectionArb, (p: AxisRateParams, x: number) => {
            expect(isClose(model.rateAt(-x, p), -model.rateAt(x, p))).toBe(true);
          }),
        );
      });

      it('never returns NaN or Infinity', () => {
        fc.assert(
          fc.property(params, deflectionArb, (p: AxisRateParams, x: number) => {
            expect(Number.isFinite(model.rateAt(x, p))).toBe(true);
            expect(Number.isFinite(model.centerSensitivityDegPerSec(p))).toBe(true);
            expect(Number.isFinite(model.maxRateDegPerSec(p))).toBe(true);
            expect(Number.isFinite(model.outputMaxDegPerSec(p))).toBe(true);
          }),
        );
      });

      it('never exceeds rate_limit', () => {
        fc.assert(
          fc.property(params, deflectionArb, (p: AxisRateParams, x: number) => {
            expect(Math.abs(model.rateAt(x, p))).toBeLessThanOrEqual(p.rateLimit);
          }),
        );
      });

      it('never decreases as the stick moves away from centre', () => {
        fc.assert(
          fc.property(params, (p: AxisRateParams) => {
            let previous = Number.NEGATIVE_INFINITY;
            for (let step = 0; step <= 20; step += 1) {
              const rate = model.rateAt(-1 + step / 10, p);
              expect(rate).toBeGreaterThanOrEqual(previous - 1e-9);
              previous = rate;
            }
          }),
        );
      });

      it('agrees with its own summary metrics', () => {
        fc.assert(
          fc.property(params, (p: AxisRateParams) => {
            const maxRate = model.maxRateDegPerSec(p);
            const outputMax = model.outputMaxDegPerSec(p);
            expect(maxRate).toBeGreaterThanOrEqual(outputMax);
            expect(outputMax).toBeLessThanOrEqual(p.rateLimit);
            expect(isClose(model.rateAt(1, p), outputMax)).toBe(true);
            expect(isClose(model.rateAt(-1, p), -outputMax)).toBe(true);
          }),
        );
      });

      it('matches a numerical derivative at stick centre', () => {
        fc.assert(
          fc.property(params, (p: AxisRateParams) => {
            // The curve bends quadratically away from the centre, so the central
            // difference carries a small bias proportional to epsilon; keep
            // epsilon tiny so that only the slope is compared.
            const epsilon = 1e-6;
            const numeric = (model.rateAt(epsilon, p) - model.rateAt(-epsilon, p)) / (2 * epsilon);
            expect(isClose(numeric, model.centerSensitivityDegPerSec(p), 5e-3)).toBe(true);
          }),
        );
      });

      it('agrees with the value table and the sampler', () => {
        fc.assert(
          fc.property(params, (p: AxisRateParams) => {
            for (const row of rateTable(model, p)) {
              expect(row.degPerSec).toBe(model.rateAt(row.deflection, p));
            }
            const curve = sampleCurve(model, p, { points: 9 });
            expect(curve).toHaveLength(9);
            expect(curve[0]).toEqual({ deflection: -1, degPerSec: model.rateAt(-1, p) });
            expect(curve[8]).toEqual({ deflection: 1, degPerSec: model.rateAt(1, p) });
          }),
        );
      });

      it('computes curve differences consistently', () => {
        fc.assert(
          fc.property(
            paramsArb(model),
            paramsArb(model),
            (a: AxisRateParams, b: AxisRateParams) => {
              const delta = curveDelta({ model, params: a }, { model, params: b }, { points: 5 });
              expect(delta).toHaveLength(5);
              for (const point of delta) {
                expect(point.degPerSec).toBe(
                  model.rateAt(point.deflection, a) - model.rateAt(point.deflection, b),
                );
              }
            },
          ),
        );
      });

      it('keeps the three axes independent and never mutates its input', () => {
        fc.assert(
          fc.property(
            axesArb(model),
            paramsArb(model),
            (axes: Record<'roll' | 'pitch' | 'yaw', AxisRateParams>, changed: AxisRateParams) => {
              const validated = validateAxisRates(model.id, axes);
              expect(validated.ok).toBe(true);
              if (!validated.ok) {
                return;
              }
              expect(validated.value).toEqual(axes);
              expect(validated.value).not.toBe(axes);
              expect(validated.value.roll).not.toBe(axes.roll);

              const other = validateAxisRates(model.id, { ...axes, roll: changed });
              if (!other.ok) {
                return;
              }
              expect(other.value.pitch).toEqual(axes.pitch);
              expect(other.value.yaw).toEqual(axes.yaw);
              expect(model.rateAt(0.5, other.value.pitch)).toBe(model.rateAt(0.5, axes.pitch));
            },
          ),
        );
      });
    });
  }
});
