import { DEVICE_NAME_PREFIX, SERVICE_UUID, TIME_CHAR_UUID } from './constants';
import { encodeTimePayload, localUtcOffsetHours } from './protocol';

export type ClockMeta = { id: string; name: string };

export class ClockClient {
  private constructor(private readonly device: BluetoothDevice) {}

  static async tryRestore(): Promise<ClockClient | null> {
    if (!('bluetooth' in navigator)) return null;
    const bt = navigator.bluetooth;
    if (typeof bt.getDevices !== 'function') return null;
    const devices = await bt.getDevices();
    const match = devices.find((d) => d.name?.startsWith(DEVICE_NAME_PREFIX));
    return match ? new ClockClient(match) : null;
  }

  static async pickAndConnect(): Promise<ClockClient> {
    // Two filter alternatives so a clock that advertises one but not the
    // other still appears in the picker. Mirrors the iOS app's lenient
    // name-contains match.
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: DEVICE_NAME_PREFIX }, { services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    return new ClockClient(device);
  }

  get name(): string {
    return this.device.name ?? 'unknown clock';
  }

  get meta(): ClockMeta {
    return { id: this.device.id, name: this.name };
  }

  async sync(now: Date = new Date()): Promise<void> {
    if (!this.device.gatt) throw new Error('No GATT server on device');
    const server = await this.device.gatt.connect();
    try {
      const service = await server.getPrimaryService(SERVICE_UUID);
      const char = await service.getCharacteristic(TIME_CHAR_UUID);
      const payload = encodeTimePayload(now, localUtcOffsetHours(now));
      await char.writeValueWithResponse(payload);
    } finally {
      if (server.connected) server.disconnect();
    }
  }

  async forget(): Promise<void> {
    const d = this.device as BluetoothDevice & { forget?: () => Promise<void> };
    if (typeof d.forget === 'function') await d.forget();
  }
}
