import type { ParamIssue } from './types';

/** Turns any thrown value into a readable one-line message. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export type RateErrorCode = 'non-finite-deflection' | 'invalid-params' | 'invalid-options';

/**
 * Raised whenever malformed data reaches the maths core. The core never
 * silently returns NaN/Infinity: it either validates the input or throws.
 */
export class RateInputError extends Error {
  readonly code: RateErrorCode;
  readonly issues: readonly ParamIssue[];

  constructor(code: RateErrorCode, message: string, issues: readonly ParamIssue[]) {
    super(message);
    this.name = 'RateInputError';
    this.code = code;
    this.issues = issues;
  }
}
