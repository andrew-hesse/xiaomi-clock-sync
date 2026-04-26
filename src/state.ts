import type { ClockMeta } from './ble/client';

export type { ClockMeta };

export type AppState =
  | { kind: 'unsupported' }
  | { kind: 'first-visit' }
  | { kind: 'idle'; device: ClockMeta; lastSyncedAt: number | null }
  | { kind: 'connecting'; device: ClockMeta }
  | { kind: 'syncing'; device: ClockMeta }
  | { kind: 'synced'; device: ClockMeta; at: number }
  | { kind: 'error'; device: ClockMeta | null; message: string };

export type Signal<T> = {
  get(): T;
  set(next: T): void;
  subscribe(cb: (value: T) => void): () => void;
};

export function createSignal<T>(initial: T): Signal<T> {
  let value = initial;
  const subscribers = new Set<(v: T) => void>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      // Snapshot so subscribers can unsubscribe during notify without skipping siblings.
      for (const cb of [...subscribers]) cb(value);
    },
    subscribe(cb) {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
  };
}
