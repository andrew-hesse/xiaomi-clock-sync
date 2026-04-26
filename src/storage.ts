const KEY = 'xiaomi-clock-sync.v1';

export type Stored = { lastSyncedAt: number | null };

const empty: Stored = { lastSyncedAt: null };

function isStored(value: unknown): value is Stored {
  if (typeof value !== 'object' || value === null) return false;
  if (!('lastSyncedAt' in value)) return false;
  const at = (value as { lastSyncedAt: unknown }).lastSyncedAt;
  return typeof at === 'number' || at === null;
}

export function loadStored(): Stored {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStored(parsed) ? { lastSyncedAt: parsed.lastSyncedAt } : empty;
  } catch {
    return empty;
  }
}

export function saveLastSyncedAt(at: number): void {
  const payload: Stored = { lastSyncedAt: at };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function clearStored(): void {
  localStorage.removeItem(KEY);
}
