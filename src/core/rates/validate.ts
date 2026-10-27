import { collectParamIssues, normalizeParams } from './common';
import { getRateModel } from './registry';
import type { Axis, AxisRates, ParamIssue, RateModelId, ValidationResult } from './types';
import { AXES } from './types';

export type AxisParamIssue = ParamIssue & { readonly axis: Axis };

export type AxisRatesValidation =
  | { readonly ok: true; readonly value: AxisRates }
  | { readonly ok: false; readonly issues: readonly AxisParamIssue[] };

/** Validates one axis against the limits of the selected model. Never throws. */
export function validateAxisParams(modelId: RateModelId, params: unknown): ValidationResult {
  const model = getRateModel(modelId);
  const issues = collectParamIssues(model.params, params);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: normalizeParams(params) };
}

/** Validates all three axes; reports every problem with the axis attached. */
export function validateAxisRates(modelId: RateModelId, rates: unknown): AxisRatesValidation {
  const issues: AxisParamIssue[] = [];
  const source = (typeof rates === 'object' && rates !== null ? rates : {}) as Record<
    string,
    unknown
  >;

  for (const axis of AXES) {
    const result = validateAxisParams(modelId, source[axis]);
    if (result.ok) {
      continue;
    }
    for (const issue of result.issues) {
      issues.push({ ...issue, axis });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      roll: normalizeParams(source.roll),
      pitch: normalizeParams(source.pitch),
      yaw: normalizeParams(source.yaw),
    },
  };
}
