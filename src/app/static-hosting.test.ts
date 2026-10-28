import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HOME_REDIRECT, NAV_ITEMS } from './routes';

/**
 * Static-hosting invariants for GitHub Pages and other hosts without an SPA
 * rewrite rule. A regression here would only show up after a page reload on
 * the deployed site, so it is asserted in `npm run check` instead.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const viteConfig = readFileSync(`${ROOT}vite.config.ts`, 'utf8');
const appSource = readFileSync(`${ROOT}src/app/App.tsx`, 'utf8');
const indexHtml = readFileSync(`${ROOT}index.html`, 'utf8');

describe('static hosting readiness', () => {
  it('builds with a relative base so any mount point works', () => {
    expect(viteConfig).toMatch(/base:\s*['"]\.\/['"]/);
    // An absolute base would break on a GitHub Pages project subpath.
    expect(viteConfig).not.toMatch(/base:\s*['"]\/['"]/);
  });

  it('routes through the hash location hook', () => {
    expect(appSource).toMatch(/from ['"]wouter\/use-hash-location['"]/);
    expect(appSource).toMatch(/<Router hook=\{useHashLocation\}>/);
    // Without the hook wouter reads window.location.pathname, which a static
    // host cannot serve after a reload.
    expect(appSource).not.toMatch(/<Router(?![^>]*hook=)/);
  });

  it('keeps every route a hash fragment of the index page', () => {
    expect(NAV_ITEMS).toHaveLength(9);
    for (const item of NAV_ITEMS) {
      expect(item.path.startsWith('/')).toBe(true);
      expect(item.path).not.toMatch(/[#?]/);
    }
    expect(HOME_REDIRECT.startsWith('/')).toBe(true);
  });

  it('has no external or unexpected entry-point references in index.html', () => {
    const refs = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      // No external resources whatsoever.
      expect(/^https?:\/\//.test(ref)).toBe(false);
      // The only absolute path allowed before the build is Vite's own entry,
      // which `vite build` rewrites to a relative `./assets/...` URL (verified
      // against dist/index.html after `npm run build`).
      if (ref.startsWith('/')) {
        expect(ref).toBe('/src/main.tsx');
      }
    }
  });
});
