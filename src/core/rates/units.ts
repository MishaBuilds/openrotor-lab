import { RateInputError } from './errors';
import { clampTo } from './common';
import type { ParamSpec } from './types';

/**
 * The UI edits values in the unit a pilot thinks in (deg/s for ACTUAL, plain
 * CLI numbers for the legacy model) while everything is stored as the integer
 * the CLI expects. These two helpers own that conversion.
 */

export function toEditorValue(spec: ParamSpec, rawValue: number): number {
  return rawValue * spec.editorScale;
}

/** CLI integer for an edited value: snapped to the nearest integer and limited to the model range. */
export function toRawValue(spec: ParamSpec, editorValue: number): number {
  if (!Number.isFinite(editorValue)) {
    throw new RateInputError(
      'invalid-options',
      `${spec.key} must be a finite number, received ${String(editorValue)}.`,
      [],
    );
  }
  return clampTo(Math.round(editorValue / spec.editorScale), spec.min, spec.max);
}
