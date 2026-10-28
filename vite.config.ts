import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the same bundle works at any mount point: a plain
  // static server, `file://`-style inspection, and a GitHub Pages *project*
  // site (`https://<user>.github.io/<repo>/`) — where an absolute `/assets/...`
  // path would 404. No backend or rewrites are required either way.
  base: './',
  // Static, self-contained build: no external CDN, no remote assets.
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // The maths core must stay fully covered.
      include: ['src/core/rates/**'],
      exclude: ['src/core/rates/**/*.test.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100,
      },
    },
  },
});
