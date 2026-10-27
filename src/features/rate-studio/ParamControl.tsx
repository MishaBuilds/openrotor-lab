import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toEditorValue } from '../../core/rates';
import type { ParamSpec } from '../../core/rates';

export interface ParamControlProps {
  readonly spec: ParamSpec;
  /** Stored CLI integer. */
  readonly value: number;
  /** Authoritative CLI setting name, e.g. `roll_rc_rate`. */
  readonly cliSetting: string;
  readonly label: string;
  readonly hint: string;
  /** Receives the value converted to the unit edited in the UI. */
  readonly onChange: (editorValue: number) => void;
}

function formatEditor(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function parseDraft(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
}

/**
 * Slider plus numeric field for a single rate parameter.
 *
 * The slider can only produce valid CLI steps. The numeric field accepts a
 * typed value, clamps it to the range of the selected model and snaps it to
 * the nearest stored step, so the state can never hold an impossible value.
 */
export function ParamControl({
  spec,
  value,
  cliSetting,
  label,
  hint,
  onChange,
}: ParamControlProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const editorValue = toEditorValue(spec, value);
  const [draft, setDraft] = useState(() => formatEditor(editorValue));
  const [editing, setEditing] = useState(false);
  const [syncedFrom, setSyncedFrom] = useState(editorValue);

  // Follow the model value while the field is not being typed into. Adjusting
  // during render (rather than in an effect) keeps the field in sync without a
  // second commit: https://react.dev/learn/you-might-not-be-an-effect
  if (!editing && syncedFrom !== editorValue) {
    setSyncedFrom(editorValue);
    setDraft(formatEditor(editorValue));
  }

  const min = toEditorValue(spec, spec.min);
  const max = toEditorValue(spec, spec.max);
  const step = toEditorValue(spec, spec.step);

  const trimmed = draft.trim();
  const typed = parseDraft(draft);
  const invalid = trimmed.length > 0 && (!Number.isFinite(typed) || typed < min || typed > max);

  /** Returns true when the draft was accepted and applied. */
  const commit = (raw: string): boolean => {
    const candidate = parseDraft(raw);
    if (raw.trim().length === 0 || !Number.isFinite(candidate)) {
      return false;
    }
    onChange(Math.min(max, Math.max(min, candidate)));
    return true;
  };

  return (
    <div className="param">
      <div className="param__label">
        <label htmlFor={inputId}>{label}</label>
        <span className="param__cli">{t('rate.param.cli', { name: cliSetting, value })}</span>
      </div>

      <input
        className="param__slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={editorValue}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <input
        id={inputId}
        className={`input param__number${invalid ? ' input--invalid' : ''}`}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-invalid={invalid}
        onChange={(event) => {
          setEditing(true);
          setDraft(event.target.value);
          commit(event.target.value);
        }}
        onBlur={() => {
          setEditing(false);
          if (!commit(draft)) {
            setDraft(formatEditor(editorValue));
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />

      <p className="param__hint">
        {hint}
        {invalid ? ` ${t('rate.param.invalid', { min, max })}` : ''}
      </p>
    </div>
  );
}
