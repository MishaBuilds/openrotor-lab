/**
 * Shared types of the rates mathematics core.
 *
 * The formulas implemented in this folder are transcribed from *published
 * specifications* (Betaflight CLI documentation and the documented behaviour of
 * the firmware rate calculator). Nothing is copied from GPL sources: the code
 * below is an original TypeScript implementation with its own structure,
 * naming and comments.
 */

export type Axis = 'roll' | 'pitch' | 'yaw';

export const AXES = ['roll', 'pitch', 'yaw'] as const;

export function isAxis(value: unknown): value is Axis {
  return value === 'roll' || value === 'pitch' || value === 'yaw';
}

export type RateModelId = 'actual' | 'betaflight';

export type ParamKey = 'rcRate' | 'expo' | 'srate' | 'rateLimit';

export const PARAM_KEYS = ['rcRate', 'expo', 'srate', 'rateLimit'] as const;

/**
 * Parameters of a single axis, stored exactly like Betaflight stores them in
 * the CLI (`roll_rc_rate`, `roll_expo`, `roll_srate`, `roll_rate_limit`).
 * Every value is an integer.
 */
export interface AxisRateParams {
  readonly rcRate: number;
  readonly expo: number;
  readonly srate: number;
  readonly rateLimit: number;
}

export type AxisRates = Record<Axis, AxisRateParams>;

export interface ParamRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface ParamSpec extends ParamRange {
  readonly key: ParamKey;
  /** Suffix of the matching Betaflight CLI setting (`rc_rate`, `expo`, ...). */
  readonly cliName: string;
  /**
   * Unit of the value that is edited in the UI. The CLI stores an integer
   * which is mapped to that value through `editorScale`
   * (`editorValue = rawValue * editorScale`).
   */
  readonly unit: string;
  /** Multiplier between the stored CLI integer and the value edited in the UI. */
  readonly editorScale: number;
}

export type ParamIssueCode = 'missing' | 'not-number' | 'not-integer' | 'out-of-range';

export interface ParamIssue {
  readonly key: ParamKey;
  readonly code: ParamIssueCode;
  readonly min: number;
  readonly max: number;
}

export type ValidationResult =
  | { readonly ok: true; readonly value: AxisRateParams }
  | { readonly ok: false; readonly issues: readonly ParamIssue[] };

/**
 * Contract implemented by every rates model that this application treats as
 * supported. Models outside of this contract are listed as "not implemented"
 * and are never evaluated.
 */
export interface RateModel {
  readonly id: RateModelId;
  /** Value of the Betaflight `rates_type` setting this model corresponds to. */
  readonly cliRatesType: 'ACTUAL' | 'BETAFLIGHT';
  /** Model specific limits of the four CLI parameters. */
  readonly params: Readonly<Record<ParamKey, ParamSpec>>;
  /** Output rate in deg/s for stick deflection in [-1, 1], after `rate_limit`. */
  rateAt(deflection: number, params: AxisRateParams): number;
  /** Slope of the curve at stick centre, in deg/s per full deflection. */
  centerSensitivityDegPerSec(params: AxisRateParams): number;
  /** Rate reached at full stick deflection, before `rate_limit` is applied. */
  maxRateDegPerSec(params: AxisRateParams): number;
  /** Real maximum output: `min(maxRateDegPerSec, rateLimit)`. */
  outputMaxDegPerSec(params: AxisRateParams): number;
}
