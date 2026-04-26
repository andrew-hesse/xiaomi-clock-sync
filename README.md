# Xiaomi Clock Sync — Web

Tap-to-sync the time on your Xiaomi LYWSD02 BLE clock from any Chromium
browser with Web Bluetooth. PWA-installable. Auto light/dark.

> **Companion** to the native iOS app at `~/GitHub/clock-sync` —
> same protocol, different surface. Web Bluetooth does not work on
> iOS Safari; iPhone users should use the native app.

## Browser support

- Chrome / Edge / Brave / Opera / Samsung Internet on Android and desktop.
- Firefox and Safari are unsupported (no Web Bluetooth in those engines).

## Develop

```bash
npm install
npm run dev          # vite at http://localhost:5173/xiaomi-clock-sync/
npm run test         # vitest
npm run check        # biome lint + format
npm run build        # produces dist/
```

## Deploy

Pushes to `main` deploy to GitHub Pages via Actions. The Pages URL will be
`https://<user>.github.io/xiaomi-clock-sync/`. Enable Pages in repo
settings with source = "GitHub Actions" before the first deploy.

## Manual hardware test plan

1. Open in Chrome on Android.
2. **First visit:** tap "Pair Xiaomi clock" → choose your LYWSD02 in the
   browser picker → page transitions to idle with the device card.
3. **Sync:** tap "Sync now" → button morphs into circle → arc completes
   → checkmark blooms → hero pulses → card flashes → returns to idle
   showing "synced just now".
4. **Re-attach:** reload the page → it lands on idle with no picker.
5. **Forget:** tap "Forget this clock" → reload → first-visit again.
6. **Theme:** toggle OS dark mode → tokens transition smoothly.
7. **Reduced motion:** enable in OS → pulse, halo, shake suppressed
   (success card flash still occurs as a visible-state confirmation).
8. **Unsupported:** open in Firefox → unsupported view appears.

## Architecture

- `src/ble/` — pure protocol + Web Bluetooth client (no DOM imports).
- `src/state.ts` — minimal signal store + `AppState` discriminated union.
- `src/ui/` — one file per visible state, plus `app.ts` dispatcher,
  `clock.ts`, `animations.ts`, and `dom.ts` (XSS-safe `html` template).
- `src/styles/` — token-based CSS, dark/light via `prefers-color-scheme`.

Untrusted strings (BLE-advertised device name, error messages) flow
through the `html` tagged-template helper which escapes interpolations,
plus `setHtml` parses via `DOMParser` (no script execution) — two layers
of XSS defense.

## License

MIT.
