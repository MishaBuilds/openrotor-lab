import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AXIS_ORDER, useRateStudio } from '../../store/rateStudioStore';
import { RATE_PRESETS, TABLE_STOPS, getRateModel, rateTable } from '../../core/rates';
import type { Axis, AxisRates, CurvePoint, RateModelId } from '../../core/rates';
import { ModelPicker } from './ModelPicker';
import { RateChart } from './RateChart';
import { DeltaChart } from './DeltaChart';
import { AxisCard } from './AxisCard';
import { ComparePanel } from './ComparePanel';
import type { CompareOption } from './ComparePanel';
import { PresetPanel } from './PresetPanel';
import { ProfileActions } from './ProfileActions';
import { SavedProfiles } from './SavedProfiles';
import { NoticeBar } from './NoticeBar';
import { DeltaTable, RateTable } from './RateTable';

/** A comparison target: a preset from the core catalogue or a locally saved tune. */
interface CompareSource extends CompareOption {
  readonly model: RateModelId;
  readonly axes: AxisRates;
}

function cloneAxes(rates: AxisRates): AxisRates {
  return {
    roll: { ...rates.roll },
    pitch: { ...rates.pitch },
    yaw: { ...rates.yaw },
  };
}

function subtract(a: readonly CurvePoint[], b: readonly CurvePoint[]): CurvePoint[] {
  return a.map((row, index) => ({
    deflection: row.deflection,
    degPerSec: row.degPerSec - (b[index]?.degPerSec ?? 0),
  }));
}

export function RateStudioPage() {
  const { t } = useTranslation();

  const modelId = useRateStudio((state) => state.model);
  const axes = useRateStudio((state) => state.axes);
  const visibleAxes = useRateStudio((state) => state.visibleAxes);
  const compare = useRateStudio((state) => state.compare);
  const activePresetId = useRateStudio((state) => state.activePresetId);
  const savedProfiles = useRateStudio((state) => state.savedProfiles);

  const setParam = useRateStudio((state) => state.setParam);
  const toggleAxis = useRateStudio((state) => state.toggleAxis);
  const setCompare = useRateStudio((state) => state.setCompare);
  const swapWithCompare = useRateStudio((state) => state.swapWithCompare);

  const model = getRateModel(modelId);
  const shown = AXIS_ORDER.filter((axis) => visibleAxes[axis]);

  const compareSources = useMemo<CompareSource[]>(() => {
    const fromPresets: CompareSource[] = RATE_PRESETS.map((preset) => ({
      id: `preset:${preset.id}`,
      label: t(`rate.presets.name.${preset.id}`),
      model: preset.model,
      axes: cloneAxes(preset.axes),
    }));
    const fromSaved: CompareSource[] = savedProfiles.map((record) => ({
      id: `saved:${record.id}`,
      label: record.profile.name,
      model: record.profile.model,
      axes: cloneAxes(record.profile.axes),
    }));
    return [...fromPresets, ...fromSaved];
  }, [savedProfiles, t]);

  const tables = useMemo(() => {
    const result = {} as Record<Axis, CurvePoint[]>;
    for (const axis of AXIS_ORDER) {
      result[axis] = rateTable(model, axes[axis]);
    }
    return result;
  }, [model, axes]);

  const deltaTables = useMemo(() => {
    if (!compare) {
      return null;
    }
    const compareModel = getRateModel(compare.model);
    const result = {} as Record<Axis, CurvePoint[]>;
    for (const axis of AXIS_ORDER) {
      result[axis] = subtract(
        rateTable(model, axes[axis]),
        rateTable(compareModel, compare.axes[axis]),
      );
    }
    return result;
  }, [compare, model, axes]);

  const handleCompareChange = (sourceId: string) => {
    if (!sourceId) {
      setCompare(null);
      return;
    }
    const source = compareSources.find((entry) => entry.id === sourceId);
    if (!source) {
      setCompare(null);
      return;
    }
    setCompare({
      sourceId: source.id,
      label: source.label,
      model: source.model,
      axes: cloneAxes(source.axes),
    });
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div className="stack-sm">
          <h1>{t('rate.title')}</h1>
          <p className="muted">{t('rate.subtitle')}</p>
          {activePresetId ? (
            <p className="faint">{t('rate.presets.activeNote', { preset: activePresetId })}</p>
          ) : null}
        </div>
      </div>

      <NoticeBar />

      <div className="studio">
        <div className="studio__primary">
          <ModelPicker />

          <section className="card">
            <div className="card__header">
              <h2 className="card__title">{t('rate.chart.title')}</h2>
              {compare ? <span className="badge badge--accent">{t('rate.compare.on')}</span> : null}
            </div>
            <p className="muted text-sm">{t('rate.chart.hint')}</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <RateChart modelId={modelId} rates={axes} visible={visibleAxes} compare={compare} />
            </div>
          </section>

          {AXIS_ORDER.map((axis) => (
            <AxisCard
              key={axis}
              axis={axis}
              model={model}
              params={axes[axis]}
              visible={visibleAxes[axis]}
              onToggleVisible={() => toggleAxis(axis)}
              onParam={(key, value) => setParam(axis, key, value)}
            />
          ))}

          {compare && deltaTables ? (
            <section className="card">
              <div className="card__header">
                <h2 className="card__title">{t('rate.table.deltaTitle')}</h2>
                <span className="badge">{compare.label}</span>
              </div>
              <DeltaChart modelId={modelId} rates={axes} visible={visibleAxes} compare={compare} />
              <div style={{ marginTop: 'var(--space-4)' }}>
                <DeltaTable
                  axes={shown}
                  tables={deltaTables}
                  caption={t('rate.table.deltaTitle')}
                  compareLabel={compare.label}
                />
              </div>
            </section>
          ) : null}

          <section className="card">
            <div className="card__header">
              <h2 className="card__title">{t('rate.table.title')}</h2>
            </div>
            {shown.length === 0 ? (
              <div className="empty-state">{t('rate.chart.empty')}</div>
            ) : (
              <RateTable axes={shown} tables={tables} />
            )}
          </section>
        </div>

        <div className="studio__secondary">
          <ComparePanel
            options={compareSources}
            selection={compare}
            onChange={handleCompareChange}
            onSwap={swapWithCompare}
            onClear={() => setCompare(null)}
          />

          <PresetPanel />

          <ProfileActions />

          <SavedProfiles />
        </div>
      </div>

      <p className="faint text-xs">
        {t('rate.table.stops', {
          stops: TABLE_STOPS.map((stop) => `${Math.round(stop * 100)}%`).join(', '),
        })}
      </p>
    </div>
  );
}
