# Production security notes

OpenRotor Lab ships **no** content-security-policy header or `<meta>` tag by
default. That is deliberate: a restrictive policy would break local
development, preview servers and `file://`-style inspection, and a policy that
cannot be verified locally is worse than none.

This document collects the hardening to apply when you deploy the built
`dist/` bundle. Nothing here is enabled automatically; each item is written so
you can verify it yourself.

## 1. Content Security Policy

A policy that matches what the bundle actually does:

```
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
form-action 'none';
base-uri 'none';
frame-ancestors 'none';
object-src 'none';
manifest-src 'self';
worker-src 'self';
```

Notes:

- `default-src 'none'` means nothing is fetched unless explicitly allowed.
- `style-src 'unsafe-inline'` is required because React sets inline `style`
  attributes (chart legend swatches, spacing overrides). If you want to remove
  it, those inline styles must move to CSS classes first.
- `img-src data:` is needed only if you later inline an icon as a data URL.
  The current bundle does not use data URLs — you can drop it.
- `connect-src 'self'` permits no third party. The application performs no
  requests at all; keeping it makes the intent explicit and stops accidental
  additions.

### How to add it

**Static host / reverse proxy**, e.g. nginx:

```nginx
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; manifest-src 'self'; worker-src 'self';" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=()" always;
```

`Permissions-Policy` explicitly disables `serial`, `usb` and `hid`. Hardware
Connect is not implemented in this release; disabling the APIs at the browser
level guarantees nothing can appear silently.

## 2. Verifying the policy

1. Build: `npm run build`.
2. Serve `dist/` over HTTP with the header above.
3. Open DevTools → Console: there must be **zero** CSP violations.
4. Open DevTools → Network: reload with "Disable cache"; there must be no
   request whose initiator is the app and whose host is not your own.

## 3. Offline guarantee

`src/app/no-network.test.ts` fails `npm run check` if shipped sources contain
`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`,
`RTCPeerConnection`, Web Serial/WebUSB/WebHID, `importScripts`, or an
absolute external URL outside a documentation allowlist. Keep that test green
in CI; it is the machine-checked half of the "nothing leaves your device"
claim.

## 4. Local data

Profiles live in `localStorage` under a single key. Consequences to be aware
of:

- Local storage is same-origin and is readable by any script running on the
  same origin. Do not host the app next to untrusted content.
- Clearing site data deletes every saved profile. The UI says so; export to
  back up.
- The app never writes to storage outside its own key, and never reads a key
  it did not write.

## 5. Supply chain

- Install with `npm ci` so `package-lock.json` is authoritative.
- The bundle contains no CDN references and loads no remote assets.
- `THIRD_PARTY_LICENSES.md` and `package-lock.json` are the inventory.

## 6. Explicitly out of scope for this release

- Flight-controller writes. Not implemented; must never be added without an
  explicit, reviewed consent step.
- Any form of account, sync or server-side storage.
- Analytics and telemetry of any kind.
