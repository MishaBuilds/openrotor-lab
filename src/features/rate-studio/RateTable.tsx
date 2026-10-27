import { useTranslation } from 'react-i18next';
import { TABLE_STOPS } from '../../core/rates';
import type { Axis, CurvePoint } from '../../core/rates';
import { axisLabelKey } from './paramMeta';

export interface RateTableProps {
  readonly axes: readonly Axis[];
  /** One curve per axis, sampled at `TABLE_STOPS`. */
  readonly tables: Readonly<Partial<Record<Axis, readonly CurvePoint[]>>>;
}

export interface DeltaTableProps extends RateTableProps {
  readonly caption: string;
  /** Label of the compared profile, shown in the caption line. */
  readonly compareLabel: string;
}

function stopLabel(stop: number): string {
  return `${Math.round(stop * 100)} %`;
}

function formatRate(value: number): string {
  return value.toFixed(1);
}

/** Rates at the reference stick positions (25/50/75/100 %). */
export function RateTable({ axes, tables }: RateTableProps) {
  const { t } = useTranslation();

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{t('rate.table.stick')}</th>
            {axes.map((axis) => (
              <th key={axis} scope="col">
                {t(axisLabelKey(axis))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_STOPS.map((stop, index) => (
            <tr key={stop}>
              <th scope="row">{stopLabel(stop)}</th>
              {axes.map((axis) => (
                <td key={axis} className="mono">
                  {formatRate(tables[axis]?.[index]?.degPerSec ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Same stops, but showing `current - compared`. */
export function DeltaTable({ axes, tables, caption, compareLabel }: DeltaTableProps) {
  const { t } = useTranslation();

  return (
    <div className="stack-sm">
      <p className="faint">
        <strong>{caption}</strong> — {t('rate.table.deltaHint')} {compareLabel}
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t('rate.table.stick')}</th>
              {axes.map((axis) => (
                <th key={axis} scope="col">
                  Δ {t(axisLabelKey(axis))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_STOPS.map((stop, index) => (
              <tr key={stop}>
                <th scope="row">{stopLabel(stop)}</th>
                {axes.map((axis) => {
                  const value = tables[axis]?.[index]?.degPerSec ?? 0;
                  return (
                    <td key={axis} className="mono">
                      {value > 0 ? '+' : ''}
                      {formatRate(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
