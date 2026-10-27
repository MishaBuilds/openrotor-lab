# Third-party licenses

OpenRotor Lab itself is released under the [MIT License](LICENSE).

The application ships as a self-contained static bundle: no CDN, no remote
assets, no runtime downloads. Everything listed below is compiled or bundled
into `dist/` at build time and distributed together with the source.

## Runtime dependencies

| Package         | Version | License | Purpose                         |
| --------------- | ------- | ------- | ------------------------------- |
| `react`         | ^19.3.1 | MIT     | UI rendering                    |
| `react-dom`     | ^19.3.1 | MIT     | DOM renderer                    |
| `react-i18next` | ^17.1.0 | MIT     | React bindings for translations |
| `i18next`       | ^26.5.4 | MIT     | Translation runtime             |
| `wouter`        | ^3.13.0 | MIT     | Client-side routing             |
| `zustand`       | ^5.0.15 | MIT     | Local state management          |

`react`, `react-dom`, `react-i18next`, `i18next`, `wouter` and `zustand` each
depend on further packages; their full trees and licenses are recorded in
`package-lock.json`.

## Development dependencies

Build, type-check, lint, format and test tooling. These run at development
time only and are **not** part of the shipped bundle:

`typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `@vitest/coverage-v8`,
`fast-check`, `eslint`, `@eslint/js`, `typescript-eslint`,
`eslint-plugin-react-hooks`, `globals`, `prettier`, `@types/react`,
`@types/react-dom`, `@types/node`.

## Fonts and media

No web fonts, icon sets, images or video are bundled or fetched. All icons are
original inline SVG shipped with the source.

## Rate mathematics

The formulas implemented under `src/core/rates/` are an original TypeScript
implementation transcribed from **published documentation**:

- Betaflight rate calculator documentation (<https://betaflight.com/docs/wiki/guides/current/Rate-Calculator>)
- Betaflight CLI parameter reference (<https://betaflight.com/docs/wiki/guides/current/Cli>)

No code was copied from Betaflight or any other GPL-licensed project, and no
approximate stand-in formulas are used. The Betaflight name and documentation
referenced here belong to their respective owners; this project is not
affiliated with or endorsed by the Betaflight project.
