# OpenRotor Lab

Free, open-source, **fully local** FPV tuning lab.

OpenRotor Lab models how a stick position turns into rotation speed, using the
published Betaflight rate mathematics. Everything runs in your browser: there
is no account, no server, no telemetry and nothing is uploaded.

> **Status — MVP 0.1.** One of the nine announced modules is implemented.
> Rate Studio works end to end. The remaining eight modules are announced on
> their own pages and are honest about being planned: they never show fake
> data or pretend to work.

## What works today

**Rate Studio** (`/rate-studio`)

- Two rate models implemented from the official documentation and covered by
  numeric tests:
  - **ACTUAL** — centre sensitivity and maximum rate expressed directly in
    °/s, with expo shaping the middle of the curve.
  - **BETAFLIGHT** — classic RC Rate / Expo / Super Rate behaviour, including
    the documented over-crop above RC Rate 2.00.
- Independent editors for **Roll**, **Pitch** and **Yaw**: slider plus numeric
  input, both bounded by the limits of the selected model.
- The Betaflight CLI value of each setting is shown next to its editor
  (`roll_rc_rate`, `yaw_srate`, …) and values are stored exactly as firmware
  stores them, including `rate_limit`.
- A live chart with a hover/drag readout, drawn immediately as you move a
  slider.
- A comparison mode: overlay a preset or one of your saved profiles, read the
  difference on a dedicated delta chart and table.
- Reference values at 25 / 50 / 75 / 100 % of full stick.
- Presets with provenance, and a reset that explains which firmware default
  it restored.
- JSON export and import with full validation and readable, path-specific
  error messages.
- Local-only saving of profiles in `localStorage`. No registration.
- Light and dark themes, responsive down to 375 px.

**RACEFLIGHT, KISS and QUICK** are listed as `rates_type` options but are
deliberately **not implemented**. OpenRotor Lab never approximates a model it
cannot reproduce exactly.

## What this project deliberately does not do

- No backend, no accounts, no registration.
- No paid or AI APIs, no external services of any kind.
- No telemetry, analytics or error reporting.
- No automatic sending of any data anywhere.
- No flight-controller writes. Hardware Connect is planned, read-only first,
  and requires explicit consent — it is not implemented in this release.

`src/app/no-network.test.ts` enforces this by scanning the shipped sources for
network-capable APIs and external URLs on every `npm run check`.

## Getting started

Requires Node.js 22+ and npm 10+.

```bash
npm ci          # reproducible install from package-lock.json
npm run dev     # http://localhost:5173
```

## Commands

| Command                 | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Vite dev server                                  |
| `npm run build`         | Type-check, then produce a static `dist/` bundle |
| `npm run preview`       | Serve the built bundle locally                   |
| `npm run typecheck`     | `tsc --noEmit`                                   |
| `npm run lint`          | ESLint over the whole repo                       |
| `npm run format`        | Prettier write                                   |
| `npm run format:check`  | Prettier check                                   |
| `npm run test`          | Vitest unit, golden and property tests           |
| `npm run test:coverage` | Vitest with coverage thresholds enforced         |
| `npm run check`         | typecheck + lint + test (the CI gate)            |

## Project layout

```
src/
  core/rates/     rate mathematics, validation, presets, profile serialisation
                  (100 % coverage is enforced for this folder)
  app/            shell, routing, theme, error boundary, offline guarantee
  features/
    rate-studio/  the implemented module
    planned/      honest "planned" pages for the other eight modules
  i18n/           English UI strings
  store/          Zustand stores (workspace + rate studio)
  styles/         design tokens and component styles
```

## Rate mathematics and licensing

The formulas under `src/core/rates/` are an **original** TypeScript
implementation transcribed from the published Betaflight rate calculator and
CLI documentation. No GPL-licensed source was copied, and no approximate
stand-in formulas are used. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

OpenRotor Lab is licensed under the [MIT License](LICENSE).

## Production deployment notes

The build is a plain static bundle: copy `dist/` to any static host. A
content-security-policy and further hardening recommendations that are ready
to adopt are documented in [docs/production-security.md](docs/production-security.md);
no restrictive CSP is shipped by default so that local development and
`file://`-style previews keep working.
