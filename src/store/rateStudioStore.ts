import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AXES,
  DEFAULT_PRESET_BY_MODEL,
  FIRMWARE_DEFAULT_AXES,
  createRateProfile,
  createRateProfileLibrary,
  getPreset,
  getRateModel,
  parseRateProfile,
  serializeRateProfile,
  toRawValue,
} from '../core/rates';
import type {
  Axis,
  AxisRateParams,
  AxisRates,
  ParamKey,
  ParamRange,
  ProfileIssue,
  RateModelId,
  RateProfileLibrary,
  SavedProfileRecord,
} from '../core/rates';

export type NoticeTone = 'ok' | 'error' | 'info';

/** Every message key the store can raise, in one place so tests can verify them. */
export const NOTICE_KEYS = [
  'notice.profile.saved',
  'notice.profile.saveFailed',
  'notice.profile.nameRequired',
  'notice.profile.loaded',
  'notice.profile.deleted',
  'notice.profile.imported',
  'notice.profile.importFailed',
  'notice.storage.unavailable',
  'notice.model.clamped',
  'notice.preset.loaded',
  'notice.file.unreadable',
] as const;

export type NoticeKey = (typeof NOTICE_KEYS)[number];

export interface Notice {
  readonly tone: NoticeTone;
  readonly messageKey: NoticeKey;
  readonly values?: Record<string, string | number>;
  readonly detail?: string | null;
}

export interface CompareSelection {
  readonly sourceId: string;
  readonly label: string;
  readonly model: RateModelId;
  readonly axes: AxisRates;
}

export interface RateStudioState {
  hydrated: boolean;
  profileName: string;
  model: RateModelId;
  axes: AxisRates;
  visibleAxes: Record<Axis, boolean>;
  compare: CompareSelection | null;
  savedProfiles: SavedProfileRecord[];
  notice: Notice | null;
  importIssues: ProfileIssue[] | null;
  activePresetId: string | null;

  setHydrated(value: boolean): void;
  setProfileName(name: string): void;
  setParam(axis: Axis, key: ParamKey, editorValue: number): void;
  setModel(model: RateModelId): void;
  toggleAxis(axis: Axis): void;
  applyPreset(presetId: string): void;
  resetToDefaults(): void;
  setCompare(selection: CompareSelection | null): void;
  swapWithCompare(): void;
  refreshSaved(): void;
  /** Saves the current tune locally. Returns false when the name is empty or storage is blocked. */
  saveProfile(name: string, modelId: RateModelId, rates: AxisRates): boolean;
  loadSaved(id: string): void;
  deleteSaved(id: string): void;
  importProfileJson(text: string): void;
  exportProfileJson(): string;
  notify(notice: Notice | null): void;
}

function withParam(params: AxisRateParams, key: ParamKey, value: number): AxisRateParams {
  switch (key) {
    case 'rcRate':
      return { ...params, rcRate: value };
    case 'expo':
      return { ...params, expo: value };
    case 'srate':
      return { ...params, srate: value };
    case 'rateLimit':
      return { ...params, rateLimit: value };
  }
}

function withAxis(rates: AxisRates, axis: Axis, params: AxisRateParams): AxisRates {
  switch (axis) {
    case 'roll':
      return { ...rates, roll: params };
    case 'pitch':
      return { ...rates, pitch: params };
    case 'yaw':
      return { ...rates, yaw: params };
  }
}

function withVisible(
  visible: Record<Axis, boolean>,
  axis: Axis,
  value: boolean,
): Record<Axis, boolean> {
  switch (axis) {
    case 'roll':
      return { ...visible, roll: value };
    case 'pitch':
      return { ...visible, pitch: value };
    case 'yaw':
      return { ...visible, yaw: value };
  }
}

function mapAxes(rates: AxisRates, fn: (params: AxisRateParams) => AxisRateParams): AxisRates {
  return { roll: fn(rates.roll), pitch: fn(rates.pitch), yaw: fn(rates.yaw) };
}

function cloneAxes(rates: AxisRates): AxisRates {
  return mapAxes(rates, (params) => ({ ...params }));
}

function clampInt(value: number, range: ParamRange): number {
  if (!Number.isFinite(value)) {
    return range.min;
  }
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

function clampParams(modelId: RateModelId, params: AxisRateParams): AxisRateParams {
  const spec = getRateModel(modelId).params;
  return {
    rcRate: clampInt(params.rcRate, spec.rcRate),
    expo: clampInt(params.expo, spec.expo),
    srate: clampInt(params.srate, spec.srate),
    rateLimit: clampInt(params.rateLimit, spec.rateLimit),
  };
}

function createLibrary(): RateProfileLibrary | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return createRateProfileLibrary(window.localStorage);
  } catch {
    return null;
  }
}

/**
 * Persisting the workspace is best-effort: when the browser refuses a write
 * (private mode, full quota, blocked storage) the state change must still go
 * through. Profile saves are reported separately by the profile library,
 * which surfaces the real error to the user.
 */
function safePersistStorage(raw: Storage) {
  return {
    getItem(key: string): string | null {
      try {
        return raw.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        raw.setItem(key, value);
      } catch {
        // Best-effort only: keep the in-memory workspace working.
      }
    },
    removeItem(key: string): void {
      try {
        raw.removeItem(key);
      } catch {
        // Best-effort only.
      }
    },
  };
}

const library = createLibrary();

export const useRateStudio = create<RateStudioState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profileName: 'Betaflight 2025.12 default',
      model: 'actual',
      axes: cloneAxes(FIRMWARE_DEFAULT_AXES),
      visibleAxes: { roll: true, pitch: true, yaw: true },
      compare: null,
      savedProfiles: [],
      notice: null,
      importIssues: null,
      activePresetId: 'betaflight-2025-12-default',

      setHydrated(value) {
        set({ hydrated: value });
      },

      setProfileName(name) {
        set({ profileName: name.slice(0, 60) });
      },

      setParam(axis, key, editorValue) {
        const state = get();
        const spec = getRateModel(state.model).params[key];
        const raw = toRawValue(spec, editorValue);
        const current = state.axes[axis];
        if (current[key] === raw) {
          return;
        }
        set({
          axes: withAxis(state.axes, axis, withParam(current, key, raw)),
          activePresetId: null,
        });
      },

      setModel(model) {
        const state = get();
        const axes = mapAxes(state.axes, (params) => clampParams(model, params));
        const clamped = JSON.stringify(axes) !== JSON.stringify(state.axes);
        set({
          model,
          axes,
          activePresetId: null,
          notice: clamped
            ? {
                tone: 'info',
                messageKey: 'notice.model.clamped',
                values: { model: model.toUpperCase() },
              }
            : state.notice,
        });
      },

      toggleAxis(axis) {
        const visible = get().visibleAxes;
        set({ visibleAxes: withVisible(visible, axis, !visible[axis]) });
      },

      applyPreset(presetId) {
        const preset = getPreset(presetId);
        if (!preset) {
          return;
        }
        set({
          model: preset.model,
          axes: cloneAxes(preset.axes),
          activePresetId: preset.id,
          importIssues: null,
          notice: {
            tone: 'ok',
            messageKey: 'notice.preset.loaded',
            values: { preset: preset.id },
          },
        });
      },

      resetToDefaults() {
        get().applyPreset(DEFAULT_PRESET_BY_MODEL[get().model]);
      },

      setCompare(selection) {
        set({ compare: selection });
      },

      swapWithCompare() {
        const state = get();
        if (!state.compare) {
          return;
        }
        set({
          model: state.compare.model,
          axes: cloneAxes(state.compare.axes),
          compare: {
            sourceId: 'current',
            label: state.profileName,
            model: state.model,
            axes: cloneAxes(state.axes),
          },
          activePresetId: null,
        });
      },

      refreshSaved() {
        set({ savedProfiles: library ? library.list() : [] });
      },

      saveProfile(name, modelId, rates) {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
          set({ notice: { tone: 'error', messageKey: 'notice.profile.nameRequired' } });
          return false;
        }
        if (!library) {
          set({ notice: { tone: 'error', messageKey: 'notice.storage.unavailable' } });
          return false;
        }

        const profile = createRateProfile({
          name: trimmed,
          model: modelId,
          axes: cloneAxes(rates),
          createdAt: new Date().toISOString(),
          presetId: get().activePresetId,
        });
        const result = library.save(profile);

        if (!result.ok) {
          set({
            notice: {
              tone: 'error',
              messageKey: 'notice.profile.saveFailed',
              detail: result.message,
            },
          });
          return false;
        }

        set({
          savedProfiles: library.list(),
          notice: { tone: 'ok', messageKey: 'notice.profile.saved', values: { name: trimmed } },
        });
        return true;
      },

      loadSaved(id) {
        const state = get();
        const record = state.savedProfiles.find((entry) => entry.id === id);
        if (!record) {
          return;
        }
        set({
          model: record.profile.model,
          axes: cloneAxes(record.profile.axes),
          profileName: record.profile.name,
          activePresetId: record.profile.presetId,
          importIssues: null,
          notice: {
            tone: 'ok',
            messageKey: 'notice.profile.loaded',
            values: { name: record.profile.name },
          },
        });
      },

      deleteSaved(id) {
        if (!library) {
          set({ notice: { tone: 'error', messageKey: 'notice.storage.unavailable' } });
          return;
        }
        library.remove(id);

        // A comparison built from this profile would otherwise keep pointing at
        // an entry that no longer exists in the picker.
        const sourceId = `saved:${id}`;
        const { compare } = get();
        set({
          savedProfiles: library.list(),
          compare: compare && compare.sourceId === sourceId ? null : compare,
          notice: { tone: 'ok', messageKey: 'notice.profile.deleted' },
        });
      },

      importProfileJson(text) {
        const result = parseRateProfile(text);
        if (!result.ok) {
          set({
            importIssues: [...result.issues],
            notice: {
              tone: 'error',
              messageKey: 'notice.profile.importFailed',
              values: { count: result.issues.length },
            },
          });
          return;
        }

        const profile = result.profile;
        set({
          model: profile.model,
          axes: cloneAxes(profile.axes),
          profileName: profile.name,
          activePresetId: profile.presetId,
          importIssues: null,
          notice: {
            tone: 'ok',
            messageKey: 'notice.profile.imported',
            values: { name: profile.name },
          },
        });
      },

      exportProfileJson() {
        const state = get();
        return serializeRateProfile(
          createRateProfile({
            name: state.profileName,
            model: state.model,
            axes: cloneAxes(state.axes),
            createdAt: new Date().toISOString(),
            presetId: state.activePresetId,
          }),
        );
      },

      notify(notice) {
        set({ notice });
      },
    }),
    {
      name: 'openrotor-lab/rate-studio/v1',
      storage: createJSONStorage(() => safePersistStorage(localStorage)),
      partialize: (state) => ({
        profileName: state.profileName,
        model: state.model,
        axes: state.axes,
        visibleAxes: state.visibleAxes,
        activePresetId: state.activePresetId,
      }),
      onRehydrateStorage: () => () => {
        useRateStudio.getState().setHydrated(true);
      },
    },
  ),
);

/** Axis order used everywhere in the UI. */
export const AXIS_ORDER: readonly Axis[] = AXES;
