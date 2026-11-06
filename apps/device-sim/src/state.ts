/**
 * @file apps/device-sim/src/state.ts
 * @description Persists device lock state, failure counter, and lockout timestamps to a local JSON file.
 *
 * WHY THIS EXISTS:
 * Simulates non-volatile flash memory (NVS / EEPROM) on the real ESP32, ensuring that security lockout
 * penalties survive simulator restarts and power cycles without relying on the Gateway database.
 */

import fs from 'fs';
import path from 'path';

export interface DevicePersistedState {
  failureCount: number;
  lockoutUntil: number | null;
  lockoutRepeatCount: number;
  door: 'closed' | 'open';
  bolt: 'extended' | 'retracted';
  solenoid: 'off' | 'on';
  state: 'idle' | 'gesture' | 'accept' | 'reject' | 'timeout' | 'fault' | 'lockout' | 'door_open' | 'relocking';
}

const STATE_FILE = path.resolve(process.cwd(), '.device-state.json');

const DEFAULT_STATE: DevicePersistedState = {
  failureCount: 0,
  lockoutUntil: null,
  lockoutRepeatCount: 0,
  door: 'closed',
  bolt: 'extended',
  solenoid: 'off',
  state: 'idle'
};

export function loadDeviceState(): DevicePersistedState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_STATE };
}

export function saveDeviceState(state: Partial<DevicePersistedState>): DevicePersistedState {
  const current = loadDeviceState();
  const updated = { ...current, ...state };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch {
    // ignore
  }
  return updated;
}
