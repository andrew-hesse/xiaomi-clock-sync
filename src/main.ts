import { ClockClient } from './ble/client';
import { type AppState, createSignal } from './state';
import { clearStored, loadStored, saveLastSyncedAt } from './storage';
import { mountApp } from './ui/app';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

const root = document.getElementById('app');
if (!root) throw new Error('#app mount point missing');

const supported = 'bluetooth' in navigator;

const state = createSignal<AppState>(supported ? { kind: 'first-visit' } : { kind: 'unsupported' });

let client: ClockClient | null = null;

// True when the user dismissed the OS device chooser without picking anything,
// or no devices matched the filters. Both surface as DOMException NotFoundError
// — neither is a real error from the user's perspective.
function isUserCancellation(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotFoundError';
}

function messageOf(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'SecurityError':
        return 'Bluetooth blocked by the browser. Check site permissions and reload.';
      case 'NetworkError':
        return "Couldn't connect — make sure the clock is nearby and not paired with another device.";
      case 'NotSupportedError':
        return 'This device or browser does not support Web Bluetooth.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error.';
}

async function boot(): Promise<void> {
  if (!supported) return;
  try {
    const restored = await ClockClient.tryRestore();
    if (restored) {
      client = restored;
      const stored = loadStored();
      state.set({ kind: 'idle', device: restored.meta, lastSyncedAt: stored.lastSyncedAt });
    }
  } catch (err) {
    state.set({ kind: 'error', device: null, message: messageOf(err) });
  }
}

async function pair(): Promise<void> {
  try {
    client = await ClockClient.pickAndConnect();
    const stored = loadStored();
    state.set({ kind: 'idle', device: client.meta, lastSyncedAt: stored.lastSyncedAt });
  } catch (err) {
    // Cancelling the picker is a no-op, not an error — just stay on first-visit.
    if (isUserCancellation(err)) {
      state.set({ kind: 'first-visit' });
      return;
    }
    state.set({ kind: 'error', device: client?.meta ?? null, message: messageOf(err) });
  }
}

async function sync(): Promise<void> {
  if (!client) return;
  const meta = client.meta;
  state.set({ kind: 'connecting', device: meta });
  try {
    state.set({ kind: 'syncing', device: meta });
    await client.sync();
    const at = Date.now();
    saveLastSyncedAt(at);
    state.set({ kind: 'synced', device: meta, at });
    window.setTimeout(() => {
      state.set({ kind: 'idle', device: meta, lastSyncedAt: at });
    }, 1400);
  } catch (err) {
    state.set({ kind: 'error', device: meta, message: messageOf(err) });
  }
}

async function pickAnother(): Promise<void> {
  await pair();
}

async function forget(): Promise<void> {
  if (client) await client.forget();
  client = null;
  clearStored();
  state.set({ kind: 'first-visit' });
}

function retry(): void {
  if (client) {
    state.set({ kind: 'idle', device: client.meta, lastSyncedAt: loadStored().lastSyncedAt });
  } else {
    state.set({ kind: 'first-visit' });
  }
}

mountApp(root, state, {
  onPair: pair,
  onSync: sync,
  onPickAnother: pickAnother,
  onForget: forget,
  onRetry: retry,
});

void boot();
