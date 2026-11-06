import { describe, it, expect } from 'vitest';
import {
  AttemptSchema,
  DeviceSchema,
  LockStatusSchema,
  SettingsSchema,
  generateCHeader,
  ModelExport
} from './index.js';

describe('Data Contracts Runtime Validation', () => {
  it('validates a valid Device status payload', () => {
    const validDevice = {
      deviceId: 'esp32_thenar_safe_01',
      firmwareVersion: 'v1.0.0',
      hardwareRevision: 'rev-B',
      wifiSsid: 'Lab-WiFi',
      rssi: -62,
      ip: '192.168.1.105',
      uptimeSec: 3600,
      online: true
    };
    const parsed = DeviceSchema.safeParse(validDevice);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid Device status payload with out-of-range RSSI', () => {
    const invalidDevice = {
      deviceId: 'esp32_thenar_safe_01',
      rssi: 10, // positive RSSI is invalid
      uptimeSec: -5,
      online: true
    };
    const parsed = DeviceSchema.safeParse(invalidDevice);
    expect(parsed.success).toBe(false);
  });

  it('validates a complete Biometric Attempt payload', () => {
    const validAttempt = {
      id: 'att_test_123',
      sessionId: 'sess_1',
      ts: 1730840000000,
      fingerprint: { result: 'accept', templateId: 1 },
      score: 0.88,
      tau: 0.72,
      decision: 'accept',
      failureCounterAfter: 0,
      durations: {
        touchMs: 350,
        timeToPeakForceMs: 780,
        rotationMs: 620,
        totalMs: 2450
      },
      featureDeviations: [],
      flags: ['normal_grip'],
      role: 'genuine',
      experimentSession: 'S1'
    };
    const parsed = AttemptSchema.safeParse(validAttempt);
    expect(parsed.success).toBe(true);
  });

  it('validates and applies defaults for Settings', () => {
    const rawSettings = {};
    const parsed = SettingsSchema.parse(rawSettings);
    expect(parsed.nFailuresBeforeLockout).toBe(5);
    expect(parsed.lockoutBaseSec).toBe(30);
    expect(parsed.lockoutEscalation).toBe(2.0);
    expect(parsed.experimentMode).toBe(false);
  });

  it('generates a valid thenar_model.h C header string', () => {
    const mockModel: ModelExport = {
      schemaVersion: 1,
      modelType: 'mahalanobis_shrinkage',
      featureNames: ['peakForce', 'maxAngularVelocity'],
      mean: [22.45, 175.2],
      covInv: [
        [0.08, -0.01],
        [-0.01, 0.05]
      ],
      scalingMean: [20.0, 160.0],
      scalingStd: [3.5, 15.0],
      tau: 0.72
    };

    const header = generateCHeader(mockModel);
    expect(header).toContain('#ifndef THENAR_MODEL_H');
    expect(header).toContain('#define THENAR_DECISION_TAU 0.720000f');
    expect(header).toContain('THENAR_FEATURE_MEANS');
    expect(header).toContain('THENAR_COV_INV');
  });
});
