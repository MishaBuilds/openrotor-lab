import { isRateModelId } from './registry';
import { describeError } from './errors';
import { validateAxisRates } from './validate';
import type { AxisRates, ParamIssueCode, RateModelId } from './types';

export const RATE_PROFILE_FORMAT = 'openrotor-lab/rate-profile';
export const RATE_PROFILE_VERSION = 1;
export const PROFILE_NAME_MAX_LENGTH = 60;

export interface RateProfile {
  readonly format: typeof RATE_PROFILE_FORMAT;
  readonly version: number;
  readonly name: string;
  readonly model: RateModelId;
  readonly axes: AxisRates;
  /** ISO timestamp of the last modification, empty when unknown. */
  readonly createdAt: string;
  /** Preset the values were taken from, `null` for hand tuned values. */
  readonly presetId: string | null;
}

export type ProfileIssueCode =
  | 'invalid-json'
  | 'not-an-object'
  | 'unknown-format'
  | 'unsupported-version'
  | 'invalid-name'
  | 'unknown-model'
  | 'missing-axes'
  | 'invalid-createdAt'
  | 'invalid-presetId'
  | ParamIssueCode;

export interface ProfileIssue {
  /** Location of the problem inside the document, e.g. `axes.roll.rcRate`. */
  readonly path: string;
  readonly code: ProfileIssueCode;
  readonly message: string;
  readonly min: number | null;
  readonly max: number | null;
}

export type ProfileParseResult =
  | { readonly ok: true; readonly profile: RateProfile }
  | { readonly ok: false; readonly issues: readonly ProfileIssue[] };

export interface CreateRateProfileInput {
  readonly name: string;
  readonly model: RateModelId;
  readonly axes: AxisRates;
  readonly createdAt?: string;
  readonly presetId?: string | null;
}

function issue(
  path: string,
  code: ProfileIssueCode,
  message: string,
  min: number | null = null,
  max: number | null = null,
): ProfileIssue {
  return { path, code, message, min, max };
}

export function createRateProfile(input: CreateRateProfileInput): RateProfile {
  return {
    format: RATE_PROFILE_FORMAT,
    version: RATE_PROFILE_VERSION,
    name: input.name.trim().slice(0, PROFILE_NAME_MAX_LENGTH),
    model: input.model,
    axes: input.axes,
    createdAt: input.createdAt ?? '',
    presetId: input.presetId ?? null,
  };
}

export function serializeRateProfile(profile: RateProfile): string {
  return `${JSON.stringify(profile, null, 2)}\n`;
}

export function parseRateProfile(text: string): ProfileParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      issues: [issue('$', 'invalid-json', `The file is not valid JSON: ${describeError(error)}`)],
    };
  }
  return parseRateProfileValue(parsed);
}

export function parseRateProfileValue(value: unknown): ProfileParseResult {
  const issues: ProfileIssue[] = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      ok: false,
      issues: [issue('$', 'not-an-object', 'The profile must be a JSON object.')],
    };
  }

  const doc = value as Record<string, unknown>;

  if (doc.format !== RATE_PROFILE_FORMAT) {
    issues.push(
      issue(
        'format',
        'unknown-format',
        `Expected "format": "${RATE_PROFILE_FORMAT}", received ${JSON.stringify(doc.format)}.`,
      ),
    );
  }

  if (doc.version !== RATE_PROFILE_VERSION) {
    issues.push(
      issue(
        'version',
        'unsupported-version',
        `Profile version ${String(doc.version)} is not supported; this build reads version ${RATE_PROFILE_VERSION}.`,
      ),
    );
  }

  if (typeof doc.name !== 'string' || doc.name.trim().length === 0) {
    issues.push(issue('name', 'invalid-name', 'Profile name must be a non-empty string.'));
  } else if (doc.name.length > PROFILE_NAME_MAX_LENGTH) {
    issues.push(
      issue(
        'name',
        'invalid-name',
        `Profile name must be at most ${PROFILE_NAME_MAX_LENGTH} characters.`,
      ),
    );
  }

  if (!isRateModelId(doc.model)) {
    issues.push(
      issue(
        'model',
        'unknown-model',
        `Unknown rates model ${JSON.stringify(doc.model)}; supported models are "actual" and "betaflight".`,
      ),
    );
    return { ok: false, issues };
  }

  if (typeof doc.axes !== 'object' || doc.axes === null || Array.isArray(doc.axes)) {
    issues.push(issue('axes', 'missing-axes', 'The profile has no "axes" object.'));
    return { ok: false, issues };
  }

  if (doc.createdAt !== undefined && typeof doc.createdAt !== 'string') {
    issues.push(issue('createdAt', 'invalid-createdAt', 'createdAt must be a string.'));
  }

  if (doc.presetId !== undefined && doc.presetId !== null && typeof doc.presetId !== 'string') {
    issues.push(issue('presetId', 'invalid-presetId', 'presetId must be a string or null.'));
  }

  const axesValidation = validateAxisRates(doc.model, doc.axes);
  if (!axesValidation.ok) {
    for (const paramIssue of axesValidation.issues) {
      issues.push(
        issue(
          `axes.${paramIssue.axis}.${paramIssue.key}`,
          paramIssue.code,
          `Parameter ${paramIssue.key} of ${paramIssue.axis} is invalid (${paramIssue.code}); allowed ${paramIssue.min}..${paramIssue.max}.`,
          paramIssue.min,
          paramIssue.max,
        ),
      );
    }
    return { ok: false, issues };
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    profile: {
      format: RATE_PROFILE_FORMAT,
      version: RATE_PROFILE_VERSION,
      name: (doc.name as string).trim(),
      model: doc.model,
      axes: axesValidation.value,
      createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : '',
      presetId: typeof doc.presetId === 'string' ? doc.presetId : null,
    },
  };
}
