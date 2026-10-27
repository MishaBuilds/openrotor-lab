import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Static guarantee that this release performs no network activity.
 *
 * OpenRotor Lab is local-first: no backend, no telemetry, no paid or AI APIs.
 * This test scans the shipped sources for the browser APIs that could reach
 * the network and for hard-coded external URLs, so a regression is caught by
 * `npm run check` instead of by a user.
 */

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

/** Network-capable APIs. Split so this file itself does not contain them. */
const FORBIDDEN_CALLS = [
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket(',
  'EventSource(',
  'navigator.send',
  'RTCPeerConnection',
  'importScripts(',
  'navigator.serial',
  'navigator.usb',
  'navigator.hid',
];

/**
 * Absolute http(s) references outside the documentation allowlist.
 * Documentation links inside comments never trigger a request; anything else
 * could, so it is not allowed in shipped sources.
 */
const DOC_HOSTS =
  'react\\.dev|developer\\.mozilla\\.org|betaflight\\.com|vitejs\\.dev|vitest\\.dev';
const FORBIDDEN_URL_PATTERN = new RegExp(
  `https?:\\/(\\/)(?!localhost|127\\.0\\.0\\.1|www\\.w3\\.org|schema\\.org|${DOC_HOSTS})`,
);

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSources(full, out);
      continue;
    }
    // Test files are allowed to mention the forbidden names, that is how they
    // assert against them.
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const SOURCES = collectSources(SRC_DIR);

describe('no network activity', () => {
  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN_CALLS)('does not call %s', (name) => {
    const offenders = SOURCES.filter((file) => readFileSync(file, 'utf8').includes(name)).map(
      (file) => relative(SRC_DIR, file).split(sep).join('/'),
    );
    expect(offenders).toEqual([]);
  });

  it('contains no absolute external URLs', () => {
    const offenders = SOURCES.filter((file) =>
      FORBIDDEN_URL_PATTERN.test(readFileSync(file, 'utf8')),
    ).map((file) => relative(SRC_DIR, file).split(sep).join('/'));
    expect(offenders).toEqual([]);
  });
});
