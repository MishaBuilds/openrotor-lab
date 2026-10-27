import { actualModel } from './actual';
import { betaflightModel } from './betaflight';
import { RateInputError } from './errors';
import type { RateModel, RateModelId } from './types';

/** Models that are actually implemented in this release. */
export const RATE_MODELS: readonly RateModel[] = [actualModel, betaflightModel];

/**
 * `rates_type` values announced by Betaflight that this release deliberately
 * does NOT implement. They are shown as unavailable and are never evaluated.
 */
export const PENDING_MODELS = ['RACEFLIGHT', 'KISS', 'QUICK'] as const;

export type PendingModelCliName = (typeof PENDING_MODELS)[number];

export function isRateModelId(value: unknown): value is RateModelId {
  return value === 'actual' || value === 'betaflight';
}

export function getRateModel(id: RateModelId): RateModel {
  const model = RATE_MODELS.find((candidate) => candidate.id === id);
  if (!model) {
    throw new RateInputError('invalid-options', `Unknown rates model "${String(id)}".`, []);
  }
  return model;
}
