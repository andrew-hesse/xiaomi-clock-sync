# Xiaomi Clock Sync

A small web app that sets the time on a Xiaomi **LYWSD02MMC** Bluetooth
clock from your phone or laptop with a single tap. No app install, no
account, no server — just open the page, pair once, tap *Sync*.

The LYWSD02MMC is a popular small e-ink clock+thermometer sold by
Xiaomi (often branded *Mijia*). Its internal clock drifts over time
and there's no NTP, no cellular, no Wi-Fi — the only way to set it is
via Bluetooth Low Energy. The official Mi Home app can do this, but
it's slow, requires an account, and is overkill for a one-tap action.
This page is a tiny single-purpose alternative.

---

## Live demo

Once deployed to GitHub Pages, the app will be served at:

```
https://<your-username>.github.io/xiaomi-clock-sync/
```

(Open it in a supported browser — see below — and follow the *How to use*
steps.)

---

## Browser support

This app uses the **Web Bluetooth API**, which is currently only
supported by Chromium-based browsers:

| Browser              | Android | Desktop |
|----------------------|---------|---------|
| Chrome               | ✓       | ✓       |
| Edge                 | ✓       | ✓       |
| Brave                | ✓       | ✓       |
| Opera                | ✓       | ✓       |
| Samsung Internet     | ✓       | —       |
| **Firefox**          | ✗       | ✗       |
| **Safari (iOS/Mac)** | ✗       | ✗       |

If you're on iPhone, Web Bluetooth simply isn't available in the
underlying WebKit engine — even Chrome on iOS uses WebKit and won't
work. A companion native iOS app exists for that case.

The app also requires HTTPS (or `localhost`). GitHub Pages serves
HTTPS by default, so the live URL works out of the box.

---

## How to use

1. Open the page in a supported browser.
2. Make sure Bluetooth is on and your LYWSD02MMC is powered on
   (battery installed, display showing readings).
3. Tap **Pair Xiaomi clock**. Your browser will open its native
   device chooser and scan for nearby BLE devices — your clock should
   appear as `LYWSD02` (sometimes prefixed or suffixed depending on
   firmware). Pick it.
4. The page now shows the clock's name and a **Sync now** button.
   Tap it. The clock's time is overwritten with your device's
   current time and your local UTC offset.
5. Reload the page later — it remembers the clock and goes straight
   to the sync screen, no picker.

To pair a different clock, tap **Use a different clock**. To revoke
the pairing entirely, tap **Forget** — this also calls
`BluetoothDevice.forget()` to clear the per-origin permission in your
browser.

---

## How it works

### The Bluetooth side

The LYWSD02MMC exposes a custom GATT service for time and sensor
access. The service UUID is:

```
ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6
```

We only use one characteristic — the time setter:

```
ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6   (write, no notify)
```

Writing 5 bytes to it sets the clock. The byte layout is:

| Bytes | Meaning                                           | Encoding              |
|-------|---------------------------------------------------|-----------------------|
| 0-3   | Unix epoch seconds (the absolute time)            | `uint32`, little-endian |
| 4     | Local UTC offset in hours (e.g. `+2`, `-5`)       | `int8`, signed        |

So syncing to `2026-04-26T14:30:00Z` from a UTC-5 timezone sends:

```
B0 1B 00 6A FB
└──┬──────┘ └─ -5 hours, two's complement
   └─ epoch 1777826400, little-endian
```

The clock immediately uses these to redraw its display. We disconnect
right after the write — there's no need to hold the GATT link.

The display *also* shows temperature and humidity, but this app
deliberately doesn't read those characteristics — it's scoped to a
single job.

### The web side

- A user gesture (tapping *Pair*) calls
  `navigator.bluetooth.requestDevice()`, which opens the browser's
  device chooser. We ask for devices whose name starts with `LYWSD02`
  *or* that advertise the service UUID — either match is enough.
- On subsequent visits, `navigator.bluetooth.getDevices()` returns
  the previously-permitted device handle without prompting again, so
  re-syncing is one tap instead of two.
- The selected device's GATT server is connected, the time
  characteristic is fetched, the 5-byte payload is written with
  `writeValueWithResponse()`, and we disconnect.
- The "last synced" timestamp is stored in `localStorage` so the
  page can show "synced 4 days ago" the next time you open it.

There is **no server, no telemetry, no analytics, no cookies**. The
app is a single static HTML file plus a small JS bundle (~5 KB
gzipped) hosted on GitHub Pages. All Bluetooth communication happens
directly between your browser and the clock.

---

## Develop

You'll need Node 20 or newer.

```bash
git clone https://github.com/<your-username>/xiaomi-clock-sync.git
cd xiaomi-clock-sync
npm install

npm run dev          # Vite dev server at http://localhost:5173/xiaomi-clock-sync/
npm run test         # Vitest — unit tests for protocol, storage, signal store, escapers
npm run check        # Biome lint + format
npm run typecheck    # tsc --noEmit
npm run build        # Produces dist/ (icons regenerated, then bundled)
```

Web Bluetooth requires a secure context. The Vite dev server runs on
`localhost`, which is treated as secure — no self-signed cert needed.
If you bind to a non-loopback address (e.g. for testing on a phone on
the same Wi-Fi), you'll need to set up HTTPS for that to work.

---

## Deploy

Pushes to `main` deploy automatically to GitHub Pages via
`.github/workflows/deploy.yml`.

One-time setup in your fork:

1. Push the repo to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. The next push to `main` will publish to
   `https://<your-username>.github.io/xiaomi-clock-sync/`.

The deploy URL is hard-wired to the repo name via `base:
'/xiaomi-clock-sync/'` in `vite.config.ts`. If you fork and rename,
update that string to match your repo name.

---

## Architecture

```
src/
├── ble/               Pure protocol (no DOM) + Web Bluetooth client wrapper
│   ├── constants.ts     Service / characteristic UUIDs
│   ├── protocol.ts      encodeTimePayload — 5-byte writer (unit-tested)
│   └── client.ts        ClockClient — connect / sync / disconnect / forget
├── state.ts           ~30-line signal store + AppState discriminated union
├── storage.ts         localStorage wrapper for last-synced timestamp
├── styles/            CSS tokens (light + dark) and component styles
└── ui/
    ├── app.ts           state → view dispatcher
    ├── clock.ts         Live-ticking time display (rAF loop)
    ├── animations.ts    Shake, flash, progress arc primitives
    ├── dom.ts           XSS-safe `html` tagged template + DOMParser sink
    └── views/           One file per visible state
```

No framework. No runtime dependencies. The full client bundle is
roughly 14 KB minified, ~5 KB gzipped.

Untrusted strings (the BLE-advertised device name, error messages
from the platform) flow through the `html` tagged-template helper,
which escapes interpolations, and then through `setHtml()`, which
uses `DOMParser` in `'text/html'` mode (no script execution). Two
layers of XSS defense.

---

## License

MIT.
