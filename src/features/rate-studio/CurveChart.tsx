import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { RATE_CHART_BOX, buildAreaPath, buildPath, deflectionOfX, xOf, yOf } from './chartGeometry';
import type { ChartSeries } from './chartGeometry';

const X_TICKS = [-1, -0.5, 0, 0.5, 1];
const Y_TICKS_SIGNED = [1, 0.5, 0, -0.5, -1];
const Y_TICKS_POSITIVE = [1, 0.75, 0.5, 0.25, 0];

export interface CurveChartProps {
  /** One entry per drawn line. Empty array renders the empty state of the caller. */
  readonly series: readonly ChartSeries[];
  /** Vertical half-range: the chart spans -maxY..maxY (or 0..maxY when `signed` is false). */
  readonly maxY: number;
  /** Accessible name of the chart. */
  readonly label: string;
  /** Caption below the x axis, e.g. "Stick position". */
  readonly caption: string;
  /** When true the lower half is drawn and the zero line is emphasised. */
  readonly signed: boolean;
  /** When true each curve is closed down to the zero line. */
  readonly area: boolean;
  /** Unit shown next to readout values, e.g. `°/s`. */
  readonly unit: string;
  /** Label of the x axis value in the readout. */
  readonly stickLabel: string;
}

function nearest(series: ChartSeries, deflection: number): number {
  return series.rateAt(deflection);
}

/**
 * Shared SVG line chart. Deliberately framework-agnostic with respect to the
 * rates maths: it only receives already computed points.
 */
export function CurveChart({
  series,
  maxY,
  label,
  caption,
  signed,
  area,
  unit,
  stickLabel,
}: CurveChartProps) {
  const box = RATE_CHART_BOX;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const ticks = signed ? Y_TICKS_SIGNED : Y_TICKS_POSITIVE;

  const updateHover = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const viewX = ((event.clientX - rect.left) / rect.width) * box.width;
    setHover(deflectionOfX(viewX, box));
  };

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        className="chart__svg"
        viewBox={`0 0 ${box.width} ${box.height}`}
        role="img"
        aria-label={label}
        onPointerMove={updateHover}
        onPointerDown={updateHover}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={box.padLeft}
              x2={box.width - box.padRight}
              y1={yOf(tick * maxY, maxY, box)}
              y2={yOf(tick * maxY, maxY, box)}
              stroke={tick === 0 ? 'var(--border-strong)' : 'var(--border)'}
              strokeWidth={tick === 0 ? 1.5 : 1}
            />
            <text
              x={box.padLeft - 8}
              y={yOf(tick * maxY, maxY, box) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-faint)"
            >
              {Math.round(tick * maxY)}
            </text>
          </g>
        ))}

        {X_TICKS.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={xOf(tick, box)}
              x2={xOf(tick, box)}
              y1={box.padTop}
              y2={box.height - box.padBottom}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={xOf(tick, box)}
              y={box.height - 16}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-faint)"
            >
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}

        <text
          x={box.padLeft + (box.width - box.padLeft - box.padRight) / 2}
          y={box.height - 2}
          textAnchor="middle"
          fontSize="10.5"
          fill="var(--text-faint)"
        >
          {caption}
        </text>

        {area
          ? series.map((entry) => (
              <path
                key={`area-${entry.id}`}
                d={buildAreaPath(entry.points, maxY, box)}
                fill={entry.color}
                fillOpacity="0.14"
                stroke="none"
              />
            ))
          : null}

        {series.map((entry) => (
          <path
            key={`line-${entry.id}`}
            d={buildPath(entry.points, maxY, box)}
            fill="none"
            stroke={entry.color}
            strokeWidth={entry.dashed ? 1.6 : 2.2}
            strokeDasharray={entry.dashed ? '6 4' : undefined}
            strokeLinejoin="round"
          />
        ))}

        {hover === null ? null : (
          <g>
            <line
              x1={xOf(hover, box)}
              x2={xOf(hover, box)}
              y1={box.padTop}
              y2={box.height - box.padBottom}
              stroke="var(--text-faint)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            {series.map((entry) => (
              <circle
                key={`dot-${entry.id}`}
                cx={xOf(hover, box)}
                cy={yOf(nearest(entry, hover), maxY, box)}
                r="3.4"
                fill={entry.color}
                stroke="var(--bg-panel)"
                strokeWidth="1.6"
              />
            ))}
          </g>
        )}
      </svg>

      {hover === null ? null : (
        <div className="chart__readout">
          <div className="readout-row">
            <span className="faint">{stickLabel}</span>
            <span className="mono">{Math.round(hover * 100)}%</span>
          </div>
          {series.map((entry) => (
            <div className="readout-row" key={`readout-${entry.id}`}>
              <span className="legend-item">
                <span
                  className="legend-swatch"
                  style={{
                    background: entry.color,
                    opacity: entry.dashed ? 0.6 : 1,
                  }}
                />
                {entry.label}
              </span>
              <span className="mono">
                {nearest(entry, hover).toFixed(1)} {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Re-exported so consumers can keep a single import path for chart geometry. */
export { RATE_CHART_BOX } from './chartGeometry';
