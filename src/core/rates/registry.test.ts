import { describe, expect, it } from 'vitest';
import { actualModel } from './actual';
import { betaflightModel } from './betaflight';
import { RateInputError } from './errors';
import { PENDING_MODELS, RATE_MODELS, getRateModel, isRateModelId } from './registry';
import type { RateModelId } from './types';

function captureError(fn: () => unknown): RateInputError | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error as RateInputError;
  }
}

describe('rate model registry', () => {
  it('lists exactly the implemented models, in CLI order', () => {
    expect(RATE_MODELS.map((model) => model.id)).toEqual(['actual', 'betaflight']);
    expect(RATE_MODELS.map((model) => model.cliRatesType)).toEqual(['ACTUAL', 'BETAFLIGHT']);
  });

  it('keeps unimplemented models out of the supported list', () => {
    expect([...PENDING_MODELS]).toEqual(['RACEFLIGHT', 'KISS', 'QUICK']);
    const implemented = RATE_MODELS.map((model) => model.cliRatesType);
    for (const pending of PENDING_MODELS) {
      expect(implemented).not.toContain(pending);
    }
  });

  it('resolves models by id', () => {
    expect(getRateModel('actual')).toBe(actualModel);
    expect(getRateModel('betaflight')).toBe(betaflightModel);
  });

  it('fails loudly for ids it does not implement', () => {
    const error = captureError(() => getRateModel('kiss' as RateModelId));
    expect(error).toBeInstanceOf(RateInputError);
    expect(error?.code).toBe('invalid-options');
    expect(error?.message).toContain('kiss');
  });

  it('recognises model ids', () => {
    expect(isRateModelId('actual')).toBe(true);
    expect(isRateModelId('betaflight')).toBe(true);
    expect(isRateModelId('RACEFLIGHT')).toBe(false);
    expect(isRateModelId(null)).toBe(false);
    expect(isRateModelId(7)).toBe(false);
  });
});
