import { describe, expect, it, vi } from 'vitest';
import { createSignal } from '../src/state';

describe('createSignal', () => {
  it('returns the initial value from get()', () => {
    const sig = createSignal(0);
    expect(sig.get()).toBe(0);
  });

  it('updates the value via set()', () => {
    const sig = createSignal(0);
    sig.set(42);
    expect(sig.get()).toBe(42);
  });

  it('notifies subscribers on set', () => {
    const sig = createSignal('a');
    const cb = vi.fn();
    sig.subscribe(cb);
    sig.set('b');
    expect(cb).toHaveBeenCalledWith('b');
  });

  it('does not notify subscribers when the value is identical', () => {
    const sig = createSignal(7);
    const cb = vi.fn();
    sig.subscribe(cb);
    sig.set(7);
    expect(cb).not.toHaveBeenCalled();
  });

  it('notifies on object identity change even when contents look equal', () => {
    const sig = createSignal({ n: 1 });
    const cb = vi.fn();
    sig.subscribe(cb);
    sig.set({ n: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns an unsubscribe function from subscribe', () => {
    const sig = createSignal(0);
    const cb = vi.fn();
    const off = sig.subscribe(cb);
    off();
    sig.set(1);
    expect(cb).not.toHaveBeenCalled();
  });

  it('survives a subscriber that unsubscribes during notify', () => {
    const sig = createSignal(0);
    const calls: string[] = [];
    let off2: (() => void) | undefined;
    const off1 = sig.subscribe(() => {
      calls.push('one');
      off2?.();
    });
    off2 = sig.subscribe(() => calls.push('two'));
    sig.set(1);
    expect(calls).toContain('one');
    off1();
  });
});
