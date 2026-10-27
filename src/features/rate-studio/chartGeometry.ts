import type { CurvePoint } from '../../core/rates';

export interface ChartSeries {
  readonly id: string;
  readonly label: string;
  /** Any CSS colour, usually a custom property such as `var(--roll)`. */
  readonly color: string;
  readonly points: readonly CurvePoint[];
  readonly dashed: boolean;
  /** Exact rate at an arbitrary stick position, used by the hover readout. */
  readonly rateAt: (deflection: number) => number;
}

export interface ChartBox {
  readonly width: number;
  readonly height: number;
  readonly padTop: number;
  readonly padRight: number;
  readonly padBottom: number;
  readonly padLeft: number;
}

export const RATE_CHART_BOX: ChartBox = {
  width: 680,
  height: 360,
  padTop: 18,
  padRight: 16,
  padBottom: 36,
  padLeft: 58,
};

export function plotWidth(box: ChartBox): number {
  return box.width - box.padLeft - box.padRight;
}

export function plotHeight(box: ChartBox): number {
  return box.height - box.padTop - box.padBottom;
}

/** Maps a stick position (-1..1) to viewBox x coordinates. */
export function xOf(deflection: number, box: ChartBox): number {
  return box.padLeft + ((deflection + 1) / 2) * plotWidth(box);
}

/** Maps a rate in deg/s (-maxY..maxY) to viewBox y coordinates. */
export function yOf(rate: number, maxY: number, box: ChartBox): number {
  const clamped = Math.max(-maxY, Math.min(maxY, rate));
  return box.padTop + ((maxY - clamped) / (2 * maxY)) * plotHeight(box);
}

export function deflectionOfX(px: number, box: ChartBox): number {
  const ratio = (px - box.padLeft) / plotWidth(box);
  return Math.max(-1, Math.min(1, ratio * 2 - 1));
}

export function buildPath(points: readonly CurvePoint[], maxY: number, box: ChartBox): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${xOf(point.deflection, box).toFixed(2)} ${yOf(point.degPerSec, maxY, box).toFixed(2)}`,
    )
    .join(' ');
}

/** Closed area between a curve and the zero line, used by the difference chart. */
export function buildAreaPath(points: readonly CurvePoint[], maxY: number, box: ChartBox): string {
  const first = points[0];
  const last = points[points.length - 1];
  const zero = yOf(0, maxY, box).toFixed(2);
  return `${buildPath(points, maxY, box)} L${xOf(last.deflection, box).toFixed(2)} ${zero} L${xOf(first.deflection, box).toFixed(2)} ${zero} Z`;
}

/** Rounds a value up to a readable chart ceiling (1, 2, 5 × 10^n). */
export function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 100;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
