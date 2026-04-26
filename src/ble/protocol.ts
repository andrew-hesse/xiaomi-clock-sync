// 5-byte payload to the time characteristic of a Xiaomi LYWSD02:
// bytes 0-3: uint32 little-endian Unix epoch seconds
// byte 4:    int8 UTC offset in hours (signed; UTC-5 encodes as 0xFB)
export function encodeTimePayload(now: Date, offsetHours: number): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(5);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(now.getTime() / 1000), true);
  view.setInt8(4, offsetHours);
  return new Uint8Array(buf);
}

// Date.getTimezoneOffset returns minutes WEST of UTC with inverted sign.
// e.g. UTC+2 -> -120; UTC-5 -> +300. We want hours EAST of UTC.
export function localUtcOffsetHours(d: Date = new Date()): number {
  // `-Math.round(0)` returns -0, which is !== 0 under Object.is.
  // The `|| 0` normalises -0 to +0 without affecting any other value.
  return -Math.round(d.getTimezoneOffset() / 60) || 0;
}
