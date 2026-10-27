import { parseRateProfileValue } from './profile';
import { describeError } from './errors';
import type { RateProfile } from './profile';

/**
 * Local, registration-free persistence of rate profiles. The library works on
 * an injected key/value storage so that it stays pure, testable and usable with
 * `window.localStorage` in the browser.
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedProfileRecord {
  readonly id: string;
  readonly savedAt: string;
  readonly profile: RateProfile;
}

export type SaveResult =
  { readonly ok: true; readonly id: string } | { readonly ok: false; readonly message: string };

export interface RateProfileLibrary {
  list(): SavedProfileRecord[];
  /** Saves (or replaces, when `id` already exists) a profile and reports the id used. */
  save(profile: RateProfile, id?: string): SaveResult;
  remove(id: string): boolean;
  clear(): void;
}

export interface RateProfileLibraryOptions {
  readonly storageKey?: string;
  /** Timestamp provider, injected so that behaviour stays deterministic in tests. */
  readonly now?: () => string;
  readonly newId?: () => string;
}

export const DEFAULT_PROFILES_STORAGE_KEY = 'openrotor-lab/rate-profiles/v1';

let idCounter = 0;

function defaultNewId(): string {
  idCounter += 1;
  return `profile-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function readRecords(storage: KeyValueStorage, key: string): SavedProfileRecord[] {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return [];
  }
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const records: SavedProfileRecord[] = [];
  for (const entry of parsed) {
    const record = readRecord(entry);
    if (record) {
      records.push(record);
    }
  }
  return records;
}

function readRecord(entry: unknown): SavedProfileRecord | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || typeof candidate.savedAt !== 'string') {
    return null;
  }
  const parsed = parseRateProfileValue(candidate.profile);
  if (!parsed.ok) {
    return null;
  }
  return { id: candidate.id, savedAt: candidate.savedAt, profile: parsed.profile };
}

export function createRateProfileLibrary(
  storage: KeyValueStorage,
  options: RateProfileLibraryOptions = {},
): RateProfileLibrary {
  const key = options.storageKey ?? DEFAULT_PROFILES_STORAGE_KEY;
  const now = options.now ?? defaultNow;
  const newId = options.newId ?? defaultNewId;

  return {
    list(): SavedProfileRecord[] {
      return readRecords(storage, key);
    },

    save(profile: RateProfile, id?: string): SaveResult {
      const targetId = id ?? newId();
      const record: SavedProfileRecord = { id: targetId, savedAt: now(), profile };
      const current = readRecords(storage, key);
      const exists = current.some((entry) => entry.id === targetId);
      const next = exists
        ? current.map((entry) => (entry.id === targetId ? record : entry))
        : [...current, record];

      try {
        storage.setItem(key, JSON.stringify(next));
      } catch (error) {
        return {
          ok: false,
          message: `The browser refused to store the profile locally: ${describeError(error)}`,
        };
      }
      return { ok: true, id: targetId };
    },

    remove(id: string): boolean {
      const current = readRecords(storage, key);
      const next = current.filter((entry) => entry.id !== id);
      if (next.length === current.length) {
        return false;
      }
      try {
        storage.setItem(key, JSON.stringify(next));
      } catch {
        return false;
      }
      return true;
    },

    clear(): void {
      try {
        storage.removeItem(key);
      } catch {
        // Nothing else to do: the library simply stays empty for this session.
      }
    },
  };
}
