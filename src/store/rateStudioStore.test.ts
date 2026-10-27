import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PROFILES_STORAGE_KEY,
  FIRMWARE_DEFAULT_AXES,
  parseRateProfile,
} from '../core/rates';
import type { AxisRates, SavedProfileRecord } from '../core/rates';

/**
 * Integration tests for the Rate Studio workspace store.
 *
 * The browser-based verification of these flows (save, load, delete, compare,
 * export/import) is not repeatable in CI, so the same flows are exercised here
 * against a real `localStorage`-compatible implementation.
 */

/** Minimal in-memory replacement for `localStorage`. */
class MemoryStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

const storage = new MemoryStorage();

// The store creates its profile library and its persist storage at module load,
// so the browser globals must exist before the module is imported.
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('window', { localStorage: storage });

/** Loads the store only after the browser globals above exist. */
async function loadStore() {
  return import('./rateStudioStore');
}

type StoreModule = Awaited<ReturnType<typeof loadStore>>;
let mod: StoreModule;

function clone(rates: AxisRates): AxisRates {
  return {
    roll: { ...rates.roll },
    pitch: { ...rates.pitch },
    yaw: { ...rates.yaw },
  };
}

const INITIAL = {
  hydrated: true,
  profileName: 'Betaflight 2025.12 default',
  model: 'actual' as const,
  axes: clone(FIRMWARE_DEFAULT_AXES),
  visibleAxes: { roll: true, pitch: true, yaw: true },
  compare: null,
  savedProfiles: [] as SavedProfileRecord[],
  notice: null,
  importIssues: null,
  activePresetId: 'betaflight-2025-12-default',
};

/** Profiles written by the library, read back straight from storage. */
function storedRecords(): SavedProfileRecord[] {
  const raw = storage.getItem(DEFAULT_PROFILES_STORAGE_KEY);
  return raw === null ? [] : (JSON.parse(raw) as SavedProfileRecord[]);
}

beforeAll(async () => {
  mod = await loadStore();
});

beforeEach(() => {
  storage.clear();
  mod.useRateStudio.setState({ ...INITIAL, axes: clone(FIRMWARE_DEFAULT_AXES) });
});

describe('initial state', () => {
  it('starts from the firmware default rate profile', () => {
    const state = mod.useRateStudio.getState();
    expect(state.model).toBe('actual');
    expect(state.activePresetId).toBe('betaflight-2025-12-default');
    expect(state.axes).toEqual(FIRMWARE_DEFAULT_AXES);
    expect(state.notice).toBeNull();
    expect(state.compare).toBeNull();
  });
});

describe('setParam', () => {
  it('converts the edited value to the CLI integer of the model', () => {
    // ACTUAL stores centre sensitivity as rc_rate x 10.
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 90);
    const state = mod.useRateStudio.getState();
    expect(state.axes.roll.rcRate).toBe(9);
    expect(state.axes.pitch.rcRate).toBe(7);
    expect(state.axes.yaw.rcRate).toBe(7);
  });

  it('leaves the other axes untouched', () => {
    mod.useRateStudio.getState().setParam('pitch', 'srate', 1100);
    const state = mod.useRateStudio.getState();
    expect(state.axes.pitch.srate).toBe(110);
    expect(state.axes.roll.srate).toBe(67);
    expect(state.axes.yaw.srate).toBe(67);
  });

  it('clamps an out-of-range value to the model limit', () => {
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 99999);
    expect(mod.useRateStudio.getState().axes.roll.rcRate).toBe(200);

    mod.useRateStudio.getState().setParam('roll', 'rcRate', -50);
    expect(mod.useRateStudio.getState().axes.roll.rcRate).toBe(1);
  });

  it('clears the active preset marker', () => {
    mod.useRateStudio.getState().setParam('roll', 'expo', 1);
    expect(mod.useRateStudio.getState().activePresetId).toBeNull();
  });
});

describe('setModel', () => {
  it('keeps values that are valid in the target model', () => {
    mod.useRateStudio.getState().setModel('betaflight');
    const state = mod.useRateStudio.getState();
    expect(state.model).toBe('betaflight');
    expect(state.notice).toBeNull();
    expect(state.axes.roll.rcRate).toBe(7);
  });

  it('clamps values beyond the target model limits and says so', () => {
    // BETAFLIGHT accepts rc_rate up to 255; ACTUAL only up to 200.
    mod.useRateStudio.getState().setModel('betaflight');
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 250);
    expect(mod.useRateStudio.getState().axes.roll.rcRate).toBe(250);

    mod.useRateStudio.getState().setModel('actual');
    const state = mod.useRateStudio.getState();
    expect(state.axes.roll.rcRate).toBe(200);
    expect(state.notice?.messageKey).toBe('notice.model.clamped');
  });
});

describe('presets and reset', () => {
  it('loads a preset for every model in the catalogue', () => {
    const store = mod.useRateStudio.getState();
    store.applyPreset('example-legacy-race');
    const state = mod.useRateStudio.getState();
    expect(state.model).toBe('betaflight');
    expect(state.activePresetId).toBe('example-legacy-race');
    expect(state.notice?.messageKey).toBe('notice.preset.loaded');
  });

  it('ignores an unknown preset id', () => {
    const before = mod.useRateStudio.getState().axes;
    mod.useRateStudio.getState().applyPreset('does-not-exist');
    expect(mod.useRateStudio.getState().axes).toEqual(before);
    expect(mod.useRateStudio.getState().activePresetId).toBe('betaflight-2025-12-default');
  });

  it('resets each model to its documented default', () => {
    mod.useRateStudio.getState().setModel('betaflight');
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 200);
    mod.useRateStudio.getState().resetToDefaults();
    expect(mod.useRateStudio.getState().activePresetId).toBe('example-legacy-race');
    expect(mod.useRateStudio.getState().axes.roll.rcRate).toBe(90);
  });
});

describe('saved profiles', () => {
  it('saves, lists, reloads and deletes a profile locally', () => {
    const store = mod.useRateStudio.getState();
    const ok = store.saveProfile('My tune', 'actual', {
      roll: { rcRate: 9, expo: 20, srate: 110, rateLimit: 1998 },
      pitch: { rcRate: 9, expo: 20, srate: 110, rateLimit: 1998 },
      yaw: { rcRate: 10, expo: 10, srate: 100, rateLimit: 1998 },
    });

    expect(ok).toBe(true);
    const saved = mod.useRateStudio.getState().savedProfiles;
    expect(saved).toHaveLength(1);
    expect(saved[0].profile.name).toBe('My tune');
    expect(storedRecords()).toHaveLength(1);

    // Diverge, then reload the stored tune.
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 50);
    mod.useRateStudio.getState().loadSaved(saved[0].id);
    const reloaded = mod.useRateStudio.getState();
    expect(reloaded.model).toBe('actual');
    expect(reloaded.axes.roll.rcRate).toBe(9);
    expect(reloaded.notice?.messageKey).toBe('notice.profile.loaded');

    mod.useRateStudio.getState().deleteSaved(saved[0].id);
    expect(mod.useRateStudio.getState().savedProfiles).toHaveLength(0);
    expect(mod.useRateStudio.getState().notice?.messageKey).toBe('notice.profile.deleted');
  });

  it('rejects an empty profile name without writing to storage', () => {
    const ok = mod.useRateStudio.getState().saveProfile('   ', 'actual', FIRMWARE_DEFAULT_AXES);
    expect(ok).toBe(false);
    expect(storedRecords()).toHaveLength(0);
    expect(mod.useRateStudio.getState().notice?.messageKey).toBe('notice.profile.nameRequired');
    expect(mod.useRateStudio.getState().savedProfiles).toHaveLength(0);
  });

  it('drops a comparison that points at a deleted profile', () => {
    mod.useRateStudio.getState().saveProfile('Compare me', 'actual', FIRMWARE_DEFAULT_AXES);
    const [record] = mod.useRateStudio.getState().savedProfiles;

    mod.useRateStudio.getState().setCompare({
      sourceId: `saved:${record.id}`,
      label: record.profile.name,
      model: record.profile.model,
      axes: clone(record.profile.axes),
    });
    expect(mod.useRateStudio.getState().compare).not.toBeNull();

    mod.useRateStudio.getState().deleteSaved(record.id);
    expect(mod.useRateStudio.getState().compare).toBeNull();
    expect(mod.useRateStudio.getState().savedProfiles).toHaveLength(0);
  });

  it('keeps a comparison that points at a preset when a profile is deleted', () => {
    mod.useRateStudio.getState().saveProfile('Unrelated', 'actual', FIRMWARE_DEFAULT_AXES);
    const [record] = mod.useRateStudio.getState().savedProfiles;

    mod.useRateStudio.getState().setCompare({
      sourceId: 'preset:betaflight-2025-12-default',
      label: 'Betaflight 2025.12 default',
      model: 'betaflight',
      axes: clone(FIRMWARE_DEFAULT_AXES),
    });

    mod.useRateStudio.getState().deleteSaved(record.id);
    expect(mod.useRateStudio.getState().compare?.sourceId).toBe(
      'preset:betaflight-2025-12-default',
    );
  });

  it('reports a failure when storage rejects the write', () => {
    const spy = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const ok = mod.useRateStudio.getState().saveProfile('Blocked', 'actual', FIRMWARE_DEFAULT_AXES);
    // The workspace itself must stay usable while storage is blocked.
    expect(() => mod.useRateStudio.getState().setParam('roll', 'rcRate', 90)).not.toThrow();
    spy.mockRestore();

    expect(ok).toBe(false);
    expect(mod.useRateStudio.getState().axes.roll.rcRate).toBe(9);
    expect(mod.useRateStudio.getState().notice?.messageKey).toBe('notice.profile.saveFailed');
    expect(mod.useRateStudio.getState().notice?.detail).toContain('QuotaExceeded');
  });
});

describe('export and import', () => {
  it('round-trips the current workspace through JSON', () => {
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 123);
    const json = mod.useRateStudio.getState().exportProfileJson();

    expect(() => parseRateProfile(json)).not.toThrow();
    expect(parseRateProfile(json).ok).toBe(true);

    // Wipe the workspace, then restore it from the exported text.
    mod.useRateStudio.setState({ ...INITIAL, axes: clone(FIRMWARE_DEFAULT_AXES) });
    mod.useRateStudio.getState().importProfileJson(json);

    const state = mod.useRateStudio.getState();
    expect(state.axes.roll.rcRate).toBe(12);
    expect(state.notice?.messageKey).toBe('notice.profile.imported');
    expect(state.importIssues).toBeNull();
  });

  it('rejects a malformed file and leaves the workspace untouched', () => {
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 123);
    const before = mod.useRateStudio.getState().axes;

    mod.useRateStudio.getState().importProfileJson('{"format":"nope"}');

    const state = mod.useRateStudio.getState();
    expect(state.axes).toEqual(before);
    expect(state.notice?.messageKey).toBe('notice.profile.importFailed');
    expect(state.importIssues?.length).toBeGreaterThan(0);
    expect(state.importIssues?.every((issue) => issue.path.length > 0)).toBe(true);
  });

  it('rejects unparseable text rather than throwing', () => {
    expect(() => mod.useRateStudio.getState().importProfileJson('not json at all')).not.toThrow();
    expect(mod.useRateStudio.getState().notice?.messageKey).toBe('notice.profile.importFailed');
  });
});

describe('comparison', () => {
  it('sets, swaps and clears a comparison', () => {
    mod.useRateStudio.getState().setParam('roll', 'rcRate', 123);

    mod.useRateStudio.getState().setCompare({
      sourceId: 'preset:betaflight-2025-12-default',
      label: 'Betaflight 2025.12 default',
      model: 'betaflight',
      axes: clone(FIRMWARE_DEFAULT_AXES),
    });
    const selected = mod.useRateStudio.getState().compare;
    expect(selected?.label).toBe('Betaflight 2025.12 default');
    expect(selected?.axes).toEqual(FIRMWARE_DEFAULT_AXES);

    mod.useRateStudio.getState().swapWithCompare();
    const swapped = mod.useRateStudio.getState();
    expect(swapped.model).toBe('betaflight');
    expect(swapped.compare?.model).toBe('actual');
    expect(swapped.compare?.label).toBe('Betaflight 2025.12 default');
    expect(swapped.activePresetId).toBeNull();

    mod.useRateStudio.getState().setCompare(null);
    expect(mod.useRateStudio.getState().compare).toBeNull();
  });

  it('ignores a swap when no comparison is active', () => {
    mod.useRateStudio.getState().swapWithCompare();
    expect(mod.useRateStudio.getState().compare).toBeNull();
  });
});

describe('axis visibility', () => {
  it('toggles a single axis', () => {
    mod.useRateStudio.getState().toggleAxis('yaw');
    const state = mod.useRateStudio.getState();
    expect(state.visibleAxes).toEqual({ roll: true, pitch: true, yaw: false });
  });
});
