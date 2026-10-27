import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AXIS_ORDER } from '../../store/rateStudioStore';
import type { CompareSelection } from '../../store/rateStudioStore';
import { getRateModel, sampleCurve } from '../../core/rates';
import type { Axis, AxisRates, RateModelId } from '../../core/rates';
import { CurveChart } from './CurveChart';
import { niceCeiling } from './chartGeometry';
import type { ChartSeries } from './chartGeometry';
import { axisColorVar, axisLabelKey } from './paramMeta';

export interface RateChartProps {
  readonly modelId: RateModelId;
  readonly rates: AxisRates;
  /** Which axes the user currently wants drawn. */
  readonly visible: Record<Axis, boolean>;
  /** Optional second profile drawn with the same colour but a dashed line. */
  readonly compare: CompareSelection | null;
}

/**
 * The main chart: current profile per axis, plus the compared profile drawn
 * dashed in the same axis colour so the two are easy to tell apart.
 */
export function RateChart({ modelId, rates, visible, compare }: RateChartProps) {
  const { t } = useTranslation();
  const model = getRateModel(modelId);
  const compareModel = compare ? getRateModel(compare.model) : null;
  const shown = AXIS_ORDER.filter((axis) => visible[axis]);

  const { series, ceiling } = useMemo(() => {
    const lines: ChartSeries[] = [];
    let peak = 0;

    for (const axis of shown) {
      const params = rates[axis];
      const points = sampleCurve(model, params);
      lines.push({
        id: `current-${axis}`,
        label: t(axisLabelKey(axis)),
        color: axisColorVar(axis),
        points,
        dashed: false,
        rateAt: (deflection) => model.rateAt(deflection, params),
      });
      for (const point of points) {
        peak = Math.max(peak, Math.abs(point.degPerSec));
      }

      if (compare && compareModel) {
        const comparedParams = compare.axes[axis];
        const comparedPoints = sampleCurve(compareModel, comparedParams);
        lines.push({
          id: `compare-${axis}`,
          label: t('rate.chart.comparisonLegend', {
            axis: t(axisLabelKey(axis)),
            label: compare.label,
          }),
          color: axisColorVar(axis),
          points: comparedPoints,
          dashed: true,
          rateAt: (deflection) => compareModel.rateAt(deflection, comparedParams),
        });
        for (const point of comparedPoints) {
          peak = Math.max(peak, Math.abs(point.degPerSec));
        }
      }
    }

    return { series: lines, ceiling: niceCeiling(peak) };
  }, [shown, model, rates, compare, compareModel, t]);

  if (shown.length === 0) {
    return <div className="empty-state">{t('rate.chart.empty')}</div>;
  }

  return (
    <div className="stack-sm">
      <CurveChart
        series={series}
        maxY={ceiling}
        label={t('rate.chart.title')}
        caption={t('rate.chart.stick')}
        signed
        area={false}
        unit={t('rate.unit')}
        stickLabel={t('rate.chart.stick')}
      />
      <div className="chart__legend">
        {series.map((entry) => (
          <span className="legend-item" key={entry.id}>
            <span
              className="legend-swatch"
              style={{
                background: entry.color,
                opacity: entry.dashed ? 0.6 : 1,
                borderStyle: entry.dashed ? 'dashed' : undefined,
              }}
            />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}
