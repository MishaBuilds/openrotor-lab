import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AXIS_ORDER } from '../../store/rateStudioStore';
import type { CompareSelection } from '../../store/rateStudioStore';
import { curveDelta, getRateModel } from '../../core/rates';
import type { Axis, AxisRates, RateModelId } from '../../core/rates';
import { CurveChart } from './CurveChart';
import { niceCeiling } from './chartGeometry';
import type { ChartSeries } from './chartGeometry';
import { axisColorVar, axisLabelKey } from './paramMeta';

export interface DeltaChartProps {
  readonly modelId: RateModelId;
  readonly rates: AxisRates;
  readonly visible: Record<Axis, boolean>;
  /** A delta chart only exists while a comparison is active. */
  readonly compare: CompareSelection;
}

/**
 * `current - compared` in deg/s. A flat line at zero means the two profiles
 * behave identically at that stick position.
 */
export function DeltaChart({ modelId, rates, visible, compare }: DeltaChartProps) {
  const { t } = useTranslation();
  const model = getRateModel(modelId);
  const compareModel = getRateModel(compare.model);
  const shown = AXIS_ORDER.filter((axis) => visible[axis]);

  const { series, ceiling } = useMemo(() => {
    const lines: ChartSeries[] = [];
    let peak = 0;

    for (const axis of shown) {
      const points = curveDelta(
        { model, params: rates[axis] },
        { model: compareModel, params: compare.axes[axis] },
      );
      lines.push({
        id: `delta-${axis}`,
        label: `${t(axisLabelKey(axis))} Δ`,
        color: axisColorVar(axis),
        points,
        dashed: false,
        rateAt: (deflection) =>
          model.rateAt(deflection, rates[axis]) -
          compareModel.rateAt(deflection, compare.axes[axis]),
      });
      for (const point of points) {
        peak = Math.max(peak, Math.abs(point.degPerSec));
      }
    }

    return { series: lines, ceiling: niceCeiling(peak) };
  }, [shown, model, compareModel, rates, compare, t]);

  if (shown.length === 0) {
    return <div className="empty-state">{t('rate.chart.empty')}</div>;
  }

  return (
    <div className="stack-sm">
      <CurveChart
        series={series}
        maxY={ceiling}
        label={t('rate.table.deltaTitle')}
        caption={t('rate.chart.stick')}
        signed
        area
        unit={t('rate.unit')}
        stickLabel={t('rate.chart.stick')}
      />
      <p className="faint text-xs">
        {t('rate.table.deltaHint')} — {compare.label}
      </p>
    </div>
  );
}
