# Xiaomi Clock Sync — Web App (Design Spec)

Date: 2026-04-26
Status: Approved (visual + scope + tech stack)
Companion to: native iOS app at `~/GitHub/clock-sync` (XiaomiClockSync)

---

## 1. Goal

A static web app, hosted on GitHub Pages, that lets a user sync their phone or
desktop's wall-clock time to a Xiaomi LYWSD02MMC BLE clock with a single tap.
The page must be a tactile, animated, brand-cohesive single-purpose utility
that supports auto light/dark theme and works offline-installable as a PWA.

## 2. Scope

### In scope (v1)
- Pair with a Xiaomi LYWSD02 clock via Web Bluetooth.
- Persist pairing across visits (silent re-attach via `navigator.bluetooth.getDevices()`).
- One-tap "Sync" — writes the local epoch + UTC offset to the time
  characteristic.
- Live-ticking clock display as the page hero.
- Show last-synced timestamp (persisted to `localStorage`).
- "Use a different clock" and "Forget this clock" affordances.
- PWA-lite: manifest + icon set, no service worker.
- Auto light/dark theme via `prefers-color-scheme`.
- Graceful unsupported-browser handling (Firefox / Safari / iOS).
- Deploy to GitHub Pages via GitHub Actions.

### Out of scope (v1)
- Sensor display (temperature, humidity, battery).
- 7-day reminder notifications.
- Service worker / offline cache.
- Multi-device dashboard (one device at a time).
- Theme manual toggle.
- Internationalisation (English only).

## 3. Tech stack

| Layer            | Choice                          | Why                                                  |
|------------------|---------------------------------|------------------------------------------------------|
| Language         | TypeScript ^5 (strict)          | Type safety on the binary BLE protocol.              |
| Build            | Vite ^8                         | Static output, fast dev, ES modules, zero config.    |
| Lint + format    | Biome ^2                        | Single tool replaces ESLint + Prettier; fast.        |
| Tests            | Vitest ^3                       | Unit tests on the pure protocol module.              |
| Framework        | None                            | One-page app, ~3 visible states; framework runtime is unjustified weight. |
| Reactive layer   | Hand-rolled signal store (~30 LOC) | Explicit, no abstraction tax.                    |
| CSS              | Hand-rolled with custom properties + `prefers-color-scheme` | Two palettes, one ruleset; no CSS-in-JS overhead. |
| Hosting          | GitHub Pages                    | Free, HTTPS by default (Web Bluetooth requires HTTPS). |
| CI               | GitHub Actions (`actions/deploy-pages@v4`) | Native, no third-party.                  |

Pinned versions go in `package.json` at scaffold time using the latest
published majors as of 2026-04-26.

## 4. Project structure

```
xiaomi-clock-sync/
  index.html                # entry; manifest <link>, theme-color, <noscript>
  src/
    main.ts                 # bootstrap: probe support, restore device, mount UI
    state.ts                # signal store (~30 LOC)
    ble/
      constants.ts          # service + characteristic UUIDs, name prefix
      protocol.ts           # encodeTimePayload, localUtcOffsetHours (pure)
      client.ts             # ClockClient: connect / sync / disconnect / forget
    storage.ts              # localStorage wrapper for { lastSyncedAt }
    ui/
      app.ts                # top-level render: state -> view selection
      views/
        unsupported.ts
        first-visit.ts
        idle.ts
        connecting.ts
        synced.ts
        error.ts
      animations.ts         # morphButton, pulse, checkmarkBloom, shake
      clock.ts              # live hero clock (rAF tick loop)
    styles/
      tokens.css            # palette + type tokens, light + dark
      base.css              # reset, layout primitives, focus ring
      app.css               # component styles
  public/
    manifest.webmanifest
    icons/                  # generated at build from src/icon.svg
      icon-192.png
      icon-512.png
      icon-maskable-512.png
      favicon.svg
  src/icon.svg              # source of truth for the PWA mark
  tests/
    protocol.test.ts        # unit tests for encodeTimePayload + offset
  .github/workflows/
    deploy.yml              # build + Pages deploy on push to main
    ci.yml                  # biome check + tsc --noEmit + vitest run on PR
  biome.json
  tsconfig.json
  vite.config.ts
  package.json
  README.md
```

### Boundaries

- `ble/` modules import only Web APIs. Zero DOM, zero UI imports. Testable
  in isolation; `protocol.ts` is pure functions over bytes.
- `ui/views/` is one file per visible state. Each view is `(state) => HTMLElement`
  with no business logic.
- `state.ts` is the only place that holds mutable state; views and BLE client
  read from it and write to it through narrow setters.
- `main.ts` is the only file that wires modules together. Everything else
  imports its dependencies; nothing reaches up.

## 5. BLE protocol layer

### `src/ble/constants.ts`

```ts
export const SERVICE_UUID       = 'ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6';
export const TIME_CHAR_UUID     = 'ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6';
export const DEVICE_NAME_PREFIX = 'LYWSD02';
```

### `src/ble/protocol.ts` (pure)

```ts
// 5 bytes: [uint32 LE epoch seconds][int8 UTC offset hours].
// Mirrors the iOS app's ClockDevice.timePayload(for:utcOffsetHours:).
export function encodeTimePayload(now: Date, offsetHours: number): Uint8Array {
  const buf  = new ArrayBuffer(5);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(now.getTime() / 1000), true /* little-endian */);
  view.setInt8(4, offsetHours);   // SIGNED: e.g. UTC-5 must encode as 0xFB.
  return new Uint8Array(buf);
}

// Date.getTimezoneOffset() returns minutes WEST of UTC with inverted sign.
// e.g. UTC+2 -> -120 minutes. We want hours EAST of UTC (+2).
export function localUtcOffsetHours(d: Date = new Date()): number {
  return -Math.round(d.getTimezoneOffset() / 60);
}
```

Tests in `tests/protocol.test.ts` cover:
- Epoch encoding little-endianness.
- Negative offset bytes (UTC-5 -> `0xFB`).
- Zero offset (UTC).
- `localUtcOffsetHours` sign convention against a stubbed `Date`.

### `src/ble/client.ts`

```ts
type ClockMeta = { id: string; name: string };

export class ClockClient {
  private constructor(private device: BluetoothDevice) {}

  /** Returns the previously-permitted device, if any. No user gesture required. */
  static async tryRestore(): Promise<ClockClient | null> {
    if (!('bluetooth' in navigator) || !('getDevices' in navigator.bluetooth)) {
      return null;
    }
    const devices = await navigator.bluetooth.getDevices();
    const match = devices.find(d => d.name?.startsWith(DEVICE_NAME_PREFIX));
    return match ? new ClockClient(match) : null;
  }

  /** Opens the browser device chooser. MUST be called from a user gesture. */
  static async pickAndConnect(): Promise<ClockClient> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
      optionalServices: [SERVICE_UUID],
    });
    return new ClockClient(device);
  }

  get name(): string { return this.device.name ?? 'unknown clock'; }
  get meta(): ClockMeta { return { id: this.device.id, name: this.name }; }

  /** Idempotent connect → write → disconnect. Throws on any failure. */
  async sync(now: Date = new Date()): Promise<void> {
    const server = await this.device.gatt!.connect();
    try {
      const service = await server.getPrimaryService(SERVICE_UUID);
      const char    = await service.getCharacteristic(TIME_CHAR_UUID);
      const payload = encodeTimePayload(now, localUtcOffsetHours(now));
      await char.writeValueWithResponse(payload);
    } finally {
      // We deliberately disconnect after each sync — keeps battery impact
      // on the clock minimal and makes state simpler (no long-lived GATT).
      if (server.connected) server.disconnect();
    }
  }

  async forget(): Promise<void> {
    if ('forget' in this.device) await (this.device as any).forget();
  }
}
```

**Why disconnect after each sync:** the LYWSD02 has only one characteristic
we care about (write-only); holding the GATT connection open buys nothing
and adds reconnection edge cases. The iOS app stays connected because it
also reads sensors continuously — we do not.

## 6. State machine

```
                    ┌─────────────┐
                    │ unsupported │  (terminal)
                    └─────────────┘
                          ▲
                          │ no Web Bluetooth
                          │
boot ──► probe ─────►──── ┴──── ►──┐
                                   │ supported
                                   ▼
                           ┌──────────────┐
                           │ first-visit  │ ◄───── forget ─────┐
                           └──────┬───────┘                    │
                                  │ pickAndConnect             │
                                  ▼                            │
                           ┌──────────────┐                    │
              ┌──────────► │     idle     │                    │
              │            └──────┬───────┘                    │
              │                   │ user taps Sync             │
              │                   ▼                            │
              │            ┌──────────────┐                    │
              │            │  connecting  │                    │
              │            └──────┬───────┘                    │
              │                   │ gatt.connect resolves      │
              │                   ▼                            │
              │            ┌──────────────┐                    │
              │            │   syncing    │                    │
              │            └──────┬───────┘                    │
              │                   │ writeValueWithResponse OK  │
              │                   ▼                            │
              │            ┌──────────────┐                    │
              └──── 1.4s ──┤    synced    │                    │
                           └──────────────┘                    │
                                                               │
                           ┌──────────────┐                    │
                  any err ►│    error     │── retry ──► idle ──┘
                           └──────────────┘
```

### Invariants
- Only `idle` and `error` accept the Sync gesture.
- The hero clock ticks in **every** state (it is the page's identity).
- `lastSyncedAt` in `localStorage` is updated only on `synced` entry.
- Forgetting a device transitions to `first-visit` and revokes the BLE permission.

## 7. UI architecture

### Reactive store (`src/state.ts`)

A minimal signal store: `createSignal<T>(initial)` returns
`{ get, set, subscribe }`. The render loop subscribes to a single root
signal `appState` of type:

```ts
type AppState =
  | { kind: 'unsupported' }
  | { kind: 'first-visit' }
  | { kind: 'idle';        device: ClockMeta; lastSyncedAt: number | null }
  | { kind: 'connecting';  device: ClockMeta }
  | { kind: 'syncing';     device: ClockMeta }
  | { kind: 'synced';      device: ClockMeta; at: number }
  | { kind: 'error';       device: ClockMeta | null; message: string };
```

When `appState` changes, `app.ts` calls the matching view's `render(state)`,
diffs at the section boundary (replace child), and lets per-view
animations play out. No virtual DOM, no reconciler — the surface is
small enough that a swap-and-animate per state is correct and cheap.

The hero clock has its own `requestAnimationFrame` loop that is
independent of `appState` and never re-renders the rest of the page.

## 8. Visual design

### Layout

Single column, `max-width: 440px`, centered, vertical safe-area padding
for notch and home-indicator on mobile.

### Palette tokens (`styles/tokens.css`)

```css
:root {
  --bg:             #FAFAF7;
  --surface:        #FFFFFF;
  --surface-raised: #F4F4F0;
  --border:         rgb(15 18 22 / 0.08);
  --ink:            #0E1116;
  --ink-muted:      #56606E;
  --ink-faint:      #9099A4;
  --accent:         #1F8B4C;
  --accent-glow:    rgb(31 139 76 / 0.12);
  --danger:         #C8312A;

  --radius-card:   14px;
  --radius-button: 12px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg:             #0E1116;
    --surface:        #171B22;
    --surface-raised: #1F242D;
    --border:         rgb(255 255 255 / 0.06);
    --ink:            #F2F4F7;
    --ink-muted:      #9CA3AF;
    --ink-faint:      #5B6573;
    --accent:         #7CDFA0;
    --accent-glow:    rgb(124 223 160 / 0.18);
    --danger:         #FF6B6B;
  }
}
```

### Typography

- **Sans:** `system-ui, "Inter", -apple-system, "Segoe UI", sans-serif`
- **Mono (data):** `"Geist Mono", "JetBrains Mono", ui-monospace, monospace`
  with `font-variant-numeric: tabular-nums slashed-zero`
- **Scale:** hero clock `clamp(64px, 12vw, 96px)`, body `15px`, micro-label
  `11px / letter-spacing: 0.18em / text-transform: uppercase`

### Hero clock

- Format `HH:MM:SS` 24-hour, tabular monospace.
- Each second the changed digit translates `-4px → 0` and fades in (180ms
  ease-out); the outgoing digit translates up and fades out.
- Colon opacity oscillates 100% ↔ 50% at 1Hz.
- Below: `Saturday · 26 Apr · UTC+2` in `--ink-muted`, sans, 13px.

### Device card

- Surface: `--surface`, 1px `--border`, `--radius-card`, padding 16px.
- Status dot 8×8, ring tone matches accent; pulses 1.6s ease-in-out
  during `connecting` / `syncing`; flashes accent-glow background on
  transition to `synced`, fades to base over 800ms.

### Primary button

- Full-bleed, height 56px, `--radius-button`, fill `--accent`, label `--bg`.
- Hover: `translateY(-1px)`, soft shadow.
- Press: spring-down `scale(0.98) translateY(1px)` 80ms.
- Connecting/syncing: width animates inward to a 56×56 circle housing a
  sweeping SVG progress arc; soft `--accent-glow` halo pulses 1.6s
  ease-in-out.
- Synced: arc completes, strokes a checkmark via `stroke-dashoffset` morph;
  scales `1 → 1.15 → 1` (320ms spring); hero pulses once `1 → 1.02 → 1`.
- After 1.4s the circle re-expands to the full button labelled "Sync now".
- Error: 3-cycle 6px shake (280ms), border + label become `--danger`.

### Tertiary actions

`Use a different clock` and `Forget this clock` are 13px text buttons
in `--ink-muted`. `Forget` opens a tiny inline confirmation
("Forget LYWSD02-01?  [Cancel]  [Forget]") inline above the link, no modal.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` disables the tick-roll, halo
pulse, scale springs, and shake. The synced state still flashes the card
briefly so the success is unambiguous.

## 9. PWA

### Manifest (`public/manifest.webmanifest`)

```json
{
  "name": "Xiaomi Clock Sync",
  "short_name": "Clock Sync",
  "description": "Sync time to your Xiaomi LYWSD02 clock over Bluetooth.",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "background_color": "#0E1116",
  "theme_color": "#0E1116",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512",
      "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Icon

Designed in `src/icon.svg`: a rounded-square `--bg` (dark `#0E1116`)
field with a centered abstract clock face whose 12 o'clock tick is a
sync chevron, rendered in `--accent` mint. Maskable variant has a 12%
safe-zone ring of solid `#0E1116`.

PNG variants (192, 512, maskable-512) generated at build time by a small
Node script (`scripts/build-icons.mjs` using `sharp`) into `public/icons/`.
Output is git-ignored and regenerated as part of `npm run build`.

## 10. Browser support

### Supported (target)
Chromium ≥ 105 on Android, ChromeOS, Windows, macOS, Linux. (Chrome,
Edge, Brave, Opera, Samsung Internet.)

### Unsupported (graceful fallback)
Detection on boot, three tiers:

```ts
const hasWebBluetooth = 'bluetooth' in navigator;
const hasGetDevices   = hasWebBluetooth &&
                        typeof navigator.bluetooth.getDevices === 'function';
```

- **`!hasWebBluetooth`** → render `unsupported.ts`: a centred message,
  "This browser doesn't support Web Bluetooth — open in Chrome, Edge,
  or Brave on Android or desktop. iPhone? Use the native app." with a
  link to the iOS app repo.
- **`hasWebBluetooth && !hasGetDevices`** (older Chromium) → app works
  in *degraded* mode: pairing is required on every visit (no silent
  restore). `tryRestore()` returns `null`; the page boots into
  `first-visit`. No banner — silent degradation.
- **`hasGetDevices`** → full experience.

A `<noscript>` block in `index.html` shows the unsupported message for
users without JS.

## 11. Accessibility

- Single visible focus ring: 2px `--accent` outline, 3px offset.
- All state changes announced via a hidden `aria-live="polite"` region.
- Hero clock is `aria-hidden="true"` (decorative); a visually-hidden
  `aria-live="off"` element exposes the time as text on demand only
  (focus event), not on every tick.
- Tap targets ≥ 48×48.
- Colour never carries meaning alone — the status dot has a label, the
  button has text, the error state has copy in addition to the danger tint.
- Respect `prefers-reduced-motion: reduce` (see §8).

## 12. Storage

`localStorage` under key `xiaomi-clock-sync.v1`:

```ts
type Stored = { lastSyncedAt: number /* epoch ms */ | null };
```

Cleared by "Forget this clock" alongside `device.forget()`. Storage is
namespaced and versioned to allow schema migration without conflict.

## 13. Testing

### Automated
- Unit: `tests/protocol.test.ts` covers `encodeTimePayload` (positive,
  negative, zero offsets; little-endian epoch) and `localUtcOffsetHours`
  sign convention. Run via Vitest.
- Type: `tsc --noEmit` in CI.
- Lint + format: `biome check` in CI.

### Manual (hardware required, documented in README)
1. Pair flow on Android Chrome with a real LYWSD02.
2. Re-attach flow: reload page → verify silent restore.
3. Sync flow: tap Sync → verify clock face on the device updates.
4. Forget flow: tap Forget → verify subsequent reload returns to first-visit.
5. Theme: toggle OS dark/light → verify smooth token transition.
6. Reduced motion: enable in OS → verify motion is suppressed.
7. Unsupported browser: open in Firefox/Safari → verify fallback message.

Web Bluetooth cannot be exercised in headless test environments and is
not worth mocking in v1. All hardware verification is manual.

## 14. Deployment

### GitHub Pages

- Repo: `<user>/xiaomi-clock-sync`.
- Pages source: GitHub Actions.
- `vite.config.ts` sets `base: '/xiaomi-clock-sync/'` so all assets
  resolve correctly under the repo subpath.
- Deploy workflow `.github/workflows/deploy.yml`:
  - Trigger: `push` to `main`.
  - Steps: checkout → setup-node 20 → `npm ci` → `npm run build` →
    `actions/upload-pages-artifact@v3` (path `dist/`) →
    `actions/deploy-pages@v4`.
  - Permissions: `pages: write`, `id-token: write`.
- HTTPS is provided by Pages; Web Bluetooth requires it.

### CI

`.github/workflows/ci.yml` runs on every PR: `biome check` →
`tsc --noEmit` → `vitest run`. Blocks merge on failure.

## 15. Out of scope / future work

- Sensor display (temp, humidity, battery) — would require subscribing
  to `EBE0CCC1` and reading `EBE0CCC4`; same code path as iOS app.
- 7-day reminder — needs service worker + Notification permission +
  periodic background sync (limited browser support); revisit if asked.
- Multi-device pairing list.
- Manual theme override.
- i18n.

---

## Appendix A — Risks & mitigations

| Risk | Mitigation |
|---|---|
| User opens in Safari/Firefox and is confused | Detect on boot; show explicit unsupported view with iOS app link. |
| Clock is out of range / off | `requestDevice` will throw; we render `error` state with a clear "make sure the clock is nearby" message and a Retry CTA. |
| `getDevices()` not available on older Chromium | Feature-detect; fall back to always-prompt picker. |
| GitHub Pages serves stale assets after deploy | No service worker → users always fetch fresh `index.html`; Vite emits content-hashed JS/CSS filenames so cached assets are versioned. |
| BLE write succeeds but device clock is wrong | Out of our control — the iOS app has the same limitation. We trust the protocol. |
| Time-of-day boundary (sync at 23:59:59 with wrong offset) | Compute payload from a single `Date` capture inside `sync()`, not pieced together — eliminates skew between epoch and offset. |
