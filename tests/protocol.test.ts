import { describe, expect, it } from 'vitest';
import { encodeTimePayload, localUtcOffsetHours } from '../src/ble/protocol';

describe('encodeTimePayload', () => {
  it('encodes a 5-byte payload: uint32 LE epoch seconds + int8 offset', () => {
    const date = new Date(Date.UTC(2026, 3, 26, 12, 0, 0));
    const expectedEpoch = Math.floor(date.getTime() / 1000);
    const result = encodeTimePayload(date, 2);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);

    // Round-trip via DataView so the test asserts the contract, not arithmetic.
    const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
    expect(view.getUint32(0, true)).toBe(expectedEpoch);
    expect(view.getInt8(4)).toBe(2);
  });

  it('encodes a negative UTC offset as a signed int8 (UTC-5 -> 0xFB)', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const result = encodeTimePayload(date, -5);
    expect(result[4]).toBe(0xfb);
  });

  it('encodes UTC (offset 0) correctly', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const result = encodeTimePayload(date, 0);
    expect(result[4]).toBe(0x00);
  });

  it('floors fractional epoch milliseconds', () => {
    const date = new Date(1777809600999); // 1777809600.999 seconds
    const result = encodeTimePayload(date, 0);
    const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
    expect(view.getUint32(0, true)).toBe(1777809600);
  });
});

describe('localUtcOffsetHours', () => {
  it('inverts the sign of getTimezoneOffset (which returns minutes WEST of UTC)', () => {
    const stub = { getTimezoneOffset: () => -120 } as Date; // UTC+2
    expect(localUtcOffsetHours(stub)).toBe(2);
  });

  it('returns negative offset for west-of-UTC timezones', () => {
    const stub = { getTimezoneOffset: () => 300 } as Date; // UTC-5
    expect(localUtcOffsetHours(stub)).toBe(-5);
  });

  it('returns 0 for UTC', () => {
    const stub = { getTimezoneOffset: () => 0 } as Date;
    expect(localUtcOffsetHours(stub)).toBe(0);
  });
});
