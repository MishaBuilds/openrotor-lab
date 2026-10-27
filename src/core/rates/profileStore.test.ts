import { describe, expect, it } from 'vitest';
import { createRateProfile, createRateProfileLibrary } from './index';
import { DEFAULT_PROFILES_STORAGE_KEY } from './profileStore';
import type { KeyValueStorage } from './profileStore';
import type { AxisRates } from './types';

class MemoryStorage implements KeyValueStorage {
  private readonly map = new Map<string, string>();
  failGet = false;
  failSet = false;
  failRemove = false;

  getItem(key: string): string | null {
    if (this.failGet) {
      throw new Error('storage is unavailable');
    }
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failSet) {
      throw new Error('QuotaExceededError');
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failRemove) {
      throw new Error('storage is unavailable');
    }
    this.map.delete(key);
  }

  seed(key: string, value: string): void {
    this.map.set(key, value);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}

const AXES: AxisRates = {
  roll: { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 },
  pitch: { rcRate: 7, expo: 0, srate: 67, rateLimit: 1998 },
  yaw: { rcRate: 10, expo: 0, srate: 60, rateLimit: 1998 },
};

function profileNamed(name: string) {
  return createRateProfile({ name, model: 'actual', axes: AXES, createdAt: '2026-05-05' });
}

describe('createRateProfileLibrary: reading', () => {
  it('returns an empty list for a fresh storage', () => {
    const library = createRateProfileLibrary(new MemoryStorage());
    expect(library.list()).toEqual([]);
  });

  it('uses the default storage key when no key is given', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage);
    library.save(profileNamed('stock'));
    expect(storage.has(DEFAULT_PROFILES_STORAGE_KEY)).toBe(true);
  });

  it('keeps profiles of different keys apart', () => {
    const storage = new MemoryStorage();
    const a = createRateProfileLibrary(storage, { storageKey: 'a' });
    const b = createRateProfileLibrary(storage, { storageKey: 'b' });
    a.save(profileNamed('only in a'));
    expect(a.list()).toHaveLength(1);
    expect(b.list()).toEqual([]);
  });

  it('survives a corrupted storage', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage);

    storage.seed(DEFAULT_PROFILES_STORAGE_KEY, '{ not json');
    expect(library.list()).toEqual([]);

    storage.seed(DEFAULT_PROFILES_STORAGE_KEY, '{"not":"an array"}');
    expect(library.list()).toEqual([]);

    storage.seed(DEFAULT_PROFILES_STORAGE_KEY, JSON.stringify([null, 7, { id: 1 }]));
    expect(library.list()).toEqual([]);

    storage.seed(
      DEFAULT_PROFILES_STORAGE_KEY,
      JSON.stringify([
        { id: 'broken', savedAt: '2026-05-05', profile: { nope: true } },
        { id: 'good', savedAt: '2026-05-05', profile: profileNamed('kept') },
      ]),
    );
    const list = library.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('good');
    expect(list[0].profile.name).toBe('kept');
  });

  it('treats an unreadable storage as empty', () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    expect(createRateProfileLibrary(storage).list()).toEqual([]);
  });
});

describe('createRateProfileLibrary: saving', () => {
  it('saves a profile with the injected id and timestamp', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, {
      storageKey: 'profiles',
      now: () => '2026-06-06T00:00:00.000Z',
      newId: () => 'fixed-id',
    });

    const result = library.save(profileNamed('race'));
    expect(result).toEqual({ ok: true, id: 'fixed-id' });

    const list = library.list();
    expect(list).toHaveLength(1);
    expect(list[0].savedAt).toBe('2026-06-06T00:00:00.000Z');
    expect(list[0].profile.name).toBe('race');
  });

  it('generates an id and a timestamp when none are injected', () => {
    const library = createRateProfileLibrary(new MemoryStorage());
    const first = library.save(profileNamed('one'));
    const second = library.save(profileNamed('two'));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.id).toMatch(/^profile-/);
      expect(second.id).not.toBe(first.id);
    }

    const [record] = library.list();
    expect(Number.isNaN(Date.parse(record.savedAt))).toBe(false);
  });

  it('replaces a profile when the id already exists', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, {
      now: () => 'first',
      newId: () => 'same-id',
    });
    library.save(profileNamed('before'));
    library.save(profileNamed('after'));

    const list = library.list();
    expect(list).toHaveLength(1);
    expect(list[0].profile.name).toBe('after');
    expect(list[0].savedAt).toBe('first');
  });

  it('replaces only the matching profile and keeps the others', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, { now: () => 'now' });
    library.save(profileNamed('first'), 'a');
    library.save(profileNamed('second'), 'b');
    library.save(profileNamed('updated'), 'a');

    const list = library.list();
    expect(list.map((record) => [record.id, record.profile.name])).toEqual([
      ['a', 'updated'],
      ['b', 'second'],
    ]);
  });

  it('reports a storage failure instead of losing the profile silently', () => {
    const storage = new MemoryStorage();
    storage.failSet = true;
    const library = createRateProfileLibrary(storage, { now: () => 'x', newId: () => 'id-1' });

    const result = library.save(profileNamed('doomed'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('refused');
      expect(result.message).toContain('QuotaExceededError');
    }
  });

  it('writes even when the previous content could not be read', () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    const library = createRateProfileLibrary(storage, { now: () => 'x', newId: () => 'id-2' });

    expect(library.save(profileNamed('fresh'))).toEqual({ ok: true, id: 'id-2' });
  });
});

describe('createRateProfileLibrary: removing', () => {
  it('removes an existing profile', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, { newId: () => 'gone' });
    library.save(profileNamed('temp'));

    expect(library.remove('gone')).toBe(true);
    expect(library.list()).toEqual([]);
  });

  it('reports a missing profile without touching the storage', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, { newId: () => 'kept' });
    library.save(profileNamed('temp'));

    expect(library.remove('unknown')).toBe(false);
    expect(library.list()).toHaveLength(1);
  });

  it('reports failure when the storage refuses to be updated', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, { newId: () => 'blocked' });
    library.save(profileNamed('temp'));

    storage.failSet = true;
    expect(library.remove('blocked')).toBe(false);
  });

  it('clears everything and tolerates an unreadable storage', () => {
    const storage = new MemoryStorage();
    const library = createRateProfileLibrary(storage, { newId: () => 'x' });
    library.save(profileNamed('temp'));
    library.clear();
    expect(storage.has(DEFAULT_PROFILES_STORAGE_KEY)).toBe(false);

    storage.failRemove = true;
    expect(() => library.clear()).not.toThrow();
  });
});
