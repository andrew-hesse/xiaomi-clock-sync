import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearStored, loadStored, saveLastSyncedAt } from '../src/storage';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
}

const storage = new MemoryStorage();
vi.stubGlobal('localStorage', storage);

afterEach(() => storage.clear());

describe('storage', () => {
  it('returns { lastSyncedAt: null } when nothing is stored', () => {
    expect(loadStored()).toEqual({ lastSyncedAt: null });
  });

  it('persists and reads back lastSyncedAt', () => {
    saveLastSyncedAt(1777809600000);
    expect(loadStored()).toEqual({ lastSyncedAt: 1777809600000 });
  });

  it('returns { lastSyncedAt: null } if stored payload is malformed JSON', () => {
    storage.setItem('xiaomi-clock-sync.v1', '{not json');
    expect(loadStored()).toEqual({ lastSyncedAt: null });
  });

  it('returns { lastSyncedAt: null } if stored payload has wrong shape', () => {
    storage.setItem('xiaomi-clock-sync.v1', '{"foo":42}');
    expect(loadStored()).toEqual({ lastSyncedAt: null });
  });

  it('clearStored removes the key', () => {
    saveLastSyncedAt(1777809600000);
    clearStored();
    expect(loadStored()).toEqual({ lastSyncedAt: null });
  });
});
