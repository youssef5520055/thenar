/**
 * @file apps/device-sim/src/simulator.ts
 * @description Core ESP32 hardware simulator engine communicating over WebSockets and HTTP.
 *
 * WHY THIS EXISTS:
 * Faithfully simulates the physical micro-controller: runs sensor synthesis at 100 Hz,
 * on-device dual-gate evaluation, MOSFET solenoid driving, and non-volatile lockout persistence.
 */

import { WebSocket } from 'ws';
import {
  generateAttemptFrames,
  extractFeatures,
  computeMahalanobisScore,
  evaluateDualGate,
  TelemetryFrame
} from '@thenar/engine';
import {
  Attempt,
  LockStatus,
  SystemStatus,
  Settings
} from '@thenar/contracts';
import { loadDeviceState, saveDeviceState, DevicePersistedState } from './state.js';

export interface SimulatorOptions {
  gatewayUrl: string;
  token: string;
  speed: number;
}

export class DeviceSimulator {
  private ws: WebSocket | null = null;
  private options: SimulatorOptions;
  private settings: Settings = {
    nFailuresBeforeLockout: 5,
    lockoutBaseSec: 30,
    lockoutEscalation: 2.0,
    solenoidHoldMs: 5000,
    experimentMode: false,
    language: 'en'
  };
  private deviceState: DevicePersistedState;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<SimulatorOptions> = {}) {
    this.options = {
      gatewayUrl: options.gatewayUrl || 'ws://localhost:3000',
      token: options.token || 'thenar-device-secret-2026',
      speed: options.speed || 1.0
    };
    this.deviceState = loadDeviceState();
  }

  public async connect(): Promise<boolean> {
    const wsUrl = `${this.options.gatewayUrl}/ws/device?token=${this.options.token}`;
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(wsUrl, {
          headers: {
            'x-device-token': this.options.token,
            'x-device-id': 'esp32_hardware_sim'
          }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.startHeartbeat();
          this.sendCurrentStatus();
          resolve(true);
        });

        this.ws.on('message', (raw: string) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'config') {
              this.settings = { ...this.settings, ...msg.settings };
            }
          } catch {
            // ignore
          }
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        });

        this.ws.on('error', () => {
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  public sendCurrentStatus(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Check lockout expiry
    if (this.deviceState.lockoutUntil && Date.now() >= this.deviceState.lockoutUntil) {
      this.deviceState = saveDeviceState({
        lockoutUntil: null,
        failureCount: 0,
        state: 'idle'
      });
    }

    const payload: SystemStatus = {
      device: {
        deviceId: 'esp32_hardware_sim',
        firmwareVersion: 'v1.0.0-esp32',
        hardwareRevision: 'rev-B',
        wifiSsid: 'Thenar-Safe-Net',
        rssi: -58,
        ip: '192.168.4.1',
        uptimeSec: Math.floor(process.uptime()),
        online: true
      },
      lock: {
        door: this.deviceState.door,
        bolt: this.deviceState.bolt,
        solenoid: this.deviceState.solenoid,
        state: this.deviceState.state,
        failureCount: this.deviceState.failureCount,
        lockoutUntil: this.deviceState.lockoutUntil
      }
    };

    this.ws.send(JSON.stringify({
      type: 'status',
      data: payload
    }));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          ts: Date.now()
        }));
        this.sendCurrentStatus();
      }
    }, 5000);
  }

  public async runScenario(scenario: string, seed?: number): Promise<Attempt | null> {
    // 1. Verify lockout
    if (this.deviceState.lockoutUntil && Date.now() < this.deviceState.lockoutUntil) {
      const remainingSec = Math.ceil((this.deviceState.lockoutUntil - Date.now()) / 1000);
      console.warn(`[ESP32 LOCKED OUT] Safe frozen. Remaining lockout cooldown: ${remainingSec}s`);
      return null;
    }

    const attemptId = `att_sim_${Date.now()}`;
    const sessionId = `sess_${scenario}_${Math.floor(Math.random() * 9000 + 1000)}`;

    let engineScenario: 'genuine' | 'impostor' | 'mimic_l1' | 'mimic_l2' | 'fault' = 'genuine';
    let fpMatch = true;
    let role: 'genuine' | 'impostor' | 'imitation' | 'unknown' = 'genuine';
    const flags: string[] = [];

    if (scenario === 'impostor') {
      engineScenario = 'impostor';
      fpMatch = false;
      role = 'impostor';
    } else if (scenario === 'mimic-l1') {
      engineScenario = 'mimic_l1';
      fpMatch = false;
      role = 'imitation';
    } else if (scenario === 'mimic-l2') {
      engineScenario = 'mimic_l2';
      fpMatch = false;
      role = 'imitation';
    } else if (scenario === 'fingerprint-accepted-impostor') {
      // SPOOF ATTACK: silicone mold bypassed Gate 1, but kinematics differ!
      engineScenario = 'impostor';
      fpMatch = true;
      role = 'impostor';
      flags.push('gate1_spoof_suspected', 'gate2_blocked');
    } else if (scenario === 'sensor-fault') {
      engineScenario = 'fault';
      fpMatch = true;
      role = 'genuine';
      flags.push('sensor_fault_injected');
    }

    // 2. Synthesize frames
    const frames = generateAttemptFrames(engineScenario, seed ?? Date.now(), scenario === 'sensor-fault');

    // 3. Stream frames to Gateway over WebSocket in ~10 Hz chunks
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const batchSize = 10;
      for (let i = 0; i < frames.length; i += batchSize) {
        const chunk = frames.slice(i, i + batchSize).map((f) => ({
          sessionId,
          tUs: Math.round(f.t * 1000000),
          force: f.force,
          gx: f.gyro,
          gy: 0,
          gz: 0,
          ax: f.accel,
          ay: 0,
          az: 0
        }));

        this.ws.send(JSON.stringify({
          type: 'frame',
          attemptId,
          frames: chunk
        }));

        if (this.options.speed > 0) {
          await new Promise((r) => setTimeout(r, Math.max(5, 50 / this.options.speed)));
        }
      }
    }

    // 4. Feature Extraction & Scoring (Done ON THE DEVICE)
    const features = extractFeatures(frames);
    const { score, deviations } = computeMahalanobisScore(features);
    const tau = -3.85;

    let decision: 'accept' | 'reject' | 'timeout' | 'invalid' = 'accept';
    if (scenario === 'sensor-fault') {
      decision = 'invalid';
    } else {
      const evaluation = evaluateDualGate(fpMatch, score, tau);
      decision = evaluation.accepted ? 'accept' : 'reject';
    }

    // 5. Update local state machine & lockout persistence
    let failureCount = this.deviceState.failureCount;
    let lockoutUntil = this.deviceState.lockoutUntil;
    let lockoutRepeat = this.deviceState.lockoutRepeatCount;
    let lockState: LockStatus['state'] = 'idle';

    if (decision === 'accept') {
      failureCount = 0;
      lockState = 'accept';
      this.deviceState = saveDeviceState({
        failureCount: 0,
        lockoutUntil: null,
        bolt: 'retracted',
        solenoid: 'on',
        state: 'accept'
      });
      this.sendCurrentStatus();

      // Solenoid hold interval then relock
      setTimeout(() => {
        this.deviceState = saveDeviceState({
          bolt: 'extended',
          solenoid: 'off',
          state: 'idle'
        });
        this.sendCurrentStatus();
      }, Math.min(3000, this.settings.solenoidHoldMs));
    } else if (decision === 'reject') {
      failureCount++;
      if (failureCount >= this.settings.nFailuresBeforeLockout) {
        lockState = 'lockout';
        const penalty = this.settings.lockoutBaseSec * Math.pow(this.settings.lockoutEscalation, lockoutRepeat);
        lockoutUntil = Date.now() + penalty * 1000;
        lockoutRepeat++;
        console.warn(`[SECURITY LOCKOUT] Escalating penalty active: ${penalty}s cooldown.`);
      } else {
        lockState = 'reject';
      }

      this.deviceState = saveDeviceState({
        failureCount,
        lockoutUntil,
        lockoutRepeatCount: lockoutRepeat,
        state: lockState
      });
      this.sendCurrentStatus();
    }

    const attemptRecord: Attempt = {
      id: attemptId,
      sessionId,
      ts: Date.now(),
      fingerprint: {
        result: fpMatch ? 'accept' : 'reject',
        templateId: fpMatch ? 1 : null
      },
      score: scenario === 'sensor-fault' ? null : score,
      tau,
      decision,
      failureCounterAfter: failureCount,
      durations: {
        touchMs: Math.round(features.t_p1 * 1000),
        timeToPeakForceMs: Math.round(features.t_time_to_peak_force * 1000),
        rotationMs: Math.round(features.t_p2 * 1000),
        totalMs: Math.round(features.t_total * 1000)
      },
      featureDeviations: deviations.map(d => ({ name: d.label, z: d.zScore })),
      flags,
      role,
      experimentSession: 'S4'
    };

    // 6. Transmit attempt decision to Gateway
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'attempt',
        attempt: attemptRecord
      }));
    }

    return attemptRecord;
  }

  public disconnect(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
