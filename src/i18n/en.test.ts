import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AXES, PARAM_KEYS, RATE_MODELS } from '../core/rates';
import { NAV_ITEMS, PLANNED_NAV_ITEMS } from '../app/routes';
import { NOTICE_KEYS } from '../store/rateStudioStore';

/**
 * The UI is English-first and every string lives in `en.json`. A missing key
 * renders as a raw key on screen, which is easy to miss by eye, so it is
 * asserted here instead.
 */

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

const MESSAGES: Record<string, unknown> = JSON.parse(
  readFileSync(join(SRC_DIR, 'i18n', 'en.json'), 'utf8'),
) as Record<string, unknown>;

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSources(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/** Resolves a dot path such as `rate.axis.roll` in the message catalogue. */
function lookup(key: string): unknown {
  let cursor: unknown = MESSAGES;
  for (const part of key.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function has(key: string): boolean {
  return lookup(key) !== undefined && typeof lookup(key) === 'string';
}

/** Every literal `t('...')` / `t("...")` used in the shipped sources. */
function literalKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const patterns = [/\bt\(\s*'([^'${}]+)'/g, /\bt\(\s*"([^"${}]+)"/g];

  for (const file of collectSources(SRC_DIR)) {
    const source = readFileSync(file, 'utf8');
    const where = relative(SRC_DIR, file).split(sep).join('/');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const key = match[1];
        found.set(key, [...(found.get(key) ?? []), where]);
      }
    }
  }
  return found;
}

describe('English message catalogue', () => {
  it('defines every literal translation key used in the sources', () => {
    const keys = literalKeys();
    expect(keys.size).toBeGreaterThan(50);

    const missing = [...keys.entries()]
      .filter(([key]) => !has(key))
      .map(([key, files]) => `${key} (${files.join(', ')})`);

    expect(missing).toEqual([]);
  });

  it('defines every notice the store can raise', () => {
    const missing = NOTICE_KEYS.filter((key) => !has(key));
    expect(missing).toEqual([]);
  });

  it('defines a label and description for every navigation item', () => {
    const missing = NAV_ITEMS.flatMap((item) =>
      has(item.labelKey) ? [] : [`${item.labelKey} (${item.id})`],
    );
    expect(missing).toEqual([]);
  });

  it('defines a name, description and planned copy for every planned module', () => {
    const planned = NAV_ITEMS.filter((item) => item.status === 'planned');
    expect(planned.length).toBeGreaterThan(0);

    // A planned item without a content key would be silently dropped from the
    // route list rather than failing, so assert it separately.
    expect(PLANNED_NAV_ITEMS).toHaveLength(planned.length);

    const missing: string[] = [];
    for (const item of planned) {
      for (const suffix of ['title', 'desc', 'points']) {
        const key = `${item.contentKey}.${suffix}`;
        const value = lookup(key);
        if (value === undefined) {
          missing.push(key);
        } else if (suffix === 'points' && !Array.isArray(value)) {
          missing.push(`${key} (expected an array of bullet points)`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('defines names and descriptions for every implemented model', () => {
    const missing = RATE_MODELS.flatMap((model) =>
      [`rate.model.${model.id}.name`, `rate.model.${model.id}.desc`].filter((key) => !has(key)),
    );
    expect(missing).toEqual([]);
  });

  it('defines a name and provenance note for every preset', () => {
    const presets: { id: string; provenance: string }[] = [
      { id: 'betaflight-2025-12-default', provenance: 'betaflight-2025-12-default' },
      { id: 'example-actual-freestyle', provenance: 'example-actual' },
      { id: 'example-legacy-race', provenance: 'example-legacy' },
    ];

    const missing = presets.flatMap((preset) =>
      [`rate.presets.name.${preset.id}`, `rate.presets.provenance.${preset.provenance}`].filter(
        (key) => !has(key),
      ),
    );
    expect(missing).toEqual([]);
  });

  it('defines a label for every axis', () => {
    const missing = AXES.filter((axis) => !has(`rate.axis.${axis}`));
    expect(missing).toEqual([]);
  });

  it('defines every parameter label and hint built by paramMeta', () => {
    const missing: string[] = [];

    for (const model of RATE_MODELS) {
      for (const key of PARAM_KEYS) {
        switch (key) {
          case 'rcRate':
          case 'srate': {
            const label = `rate.param.${key}.${model.id}`;
            if (!has(label)) missing.push(label);
            const suffix = model.id === 'actual' ? 'Actual' : 'Betaflight';
            const hint = `rate.param.hint.${key}${suffix}`;
            if (!has(hint)) missing.push(hint);
            break;
          }
          case 'expo':
          case 'rateLimit': {
            const label = `rate.param.${key}`;
            if (!has(label)) missing.push(label);
            const hint = `rate.param.hint.${key}`;
            if (!has(hint)) missing.push(hint);
            break;
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('keeps every placeholder used by a literal key', () => {
    // A key whose copy lost its placeholder still "exists" but silently drops
    // the value, so the pairs are compared explicitly.
    const required: Record<string, readonly string[]> = {
      'rate.param.cli': ['name', 'value'],
      'rate.param.invalid': ['min', 'max'],
      'rate.chart.comparisonLegend': ['axis', 'label'],
      'rate.presets.activeNote': ['preset'],
      'rate.profiles.count': ['count'],
      'rate.profiles.savedBadge': ['name'],
      'rate.profiles.savedAt': ['date'],
      'rate.table.stops': ['stops'],
      'rate.axis.visible': ['axis'],
      'rate.axis.hidden': ['axis'],
      'rate.model.ratesType': ['value'],
      'nav.theme': ['theme'],
      'notice.profile.saved': ['name'],
      'notice.profile.loaded': ['name'],
      'notice.profile.imported': ['name'],
      'notice.profile.importFailed': ['count'],
      'notice.model.clamped': ['model'],
      'notice.preset.loaded': ['preset'],
    };

    const broken: string[] = [];
    for (const [key, placeholders] of Object.entries(required)) {
      const text = lookup(key);
      if (typeof text !== 'string') {
        broken.push(`${key} (missing)`);
        continue;
      }
      for (const name of placeholders) {
        if (!text.includes(`{{${name}}}`)) {
          broken.push(`${key} (no {{${name}}})`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
