/**
 * @file packages/contracts/src/index.ts
 * @package @thenar/contracts
 * @description Single source of truth for all data schemas, payload types, and C-header export utilities across the Thenar ecosystem.
 *
 * PURPOSE:
 * Enforces strict runtime data contract validation between the physical ESP32 / device simulator,
 * the Gateway Express API, the Python Enrollment Service, and the React Companion Web App.
 *
 * WHY THIS EXISTS:
 * Prevents schema drift across polyglot components (TypeScript and Python) and guarantees that
 * biometric attempt records, telemetry frames, and fitted model matrices remain 100% numerically
 * and structurally consistent.
 */

import { z } from 'zod';

export const SCHEMA_VERSION = 1;

// ==========================================
// 1. Device Telemetry & Status Contracts
// ==========================================

export const DeviceSchema = z.object({
  deviceId: z.string().min(1),
  firmwareVersion: z.string().default('v1.0.0-esp32'),
  hardwareRevision: z.string().default('rev-B'),
  wifiSsid: z.string().default('Thenar-Safe-Net'),
  rssi: z.number().int().min(-120).max(0),
  ip: z.string().default('192.168.4.1'),
  uptimeSec: z.number().nonnegative(),
  online: z.boolean(),
  lastSeenAt: z.number().optional()
});

export type Device = z.infer<typeof DeviceSchema>;

export const LockStateEnum = z.enum([
  'idle',
  'gesture',
  'accept',
  'reject',
  'timeout',
  'fault',
  'lockout',
  'door_open',
  'relocking'
]);

export type LockState = z.infer<typeof LockStateEnum>;

export const LockStatusSchema = z.object({
  door: z.enum(['closed', 'open']),
  bolt: z.enum(['extended', 'retracted']),
  solenoid: z.enum(['off', 'on']),
  state: LockStateEnum,
  failureCount: z.number().int().nonnegative(),
  lockoutUntil: z.number().nullable()
});

export type LockStatus = z.infer<typeof LockStatusSchema>;

// Combined System Status
export const SystemStatusSchema = z.object({
  device: DeviceSchema,
  lock: LockStatusSchema
});

export type SystemStatus = z.infer<typeof SystemStatusSchema>;

// ==========================================
// 2. Biometric Attempt & Audit Contracts
// ==========================================

export const FingerprintResultSchema = z.object({
  result: z.enum(['accept', 'reject', 'capture_fail']),
  templateId: z.number().int().nullable().default(null)
});

export type FingerprintResult = z.infer<typeof FingerprintResultSchema>;

export const DurationsSchema = z.object({
  touchMs: z.number().nonnegative(),
  timeToPeakForceMs: z.number().nonnegative(),
  rotationMs: z.number().nonnegative(),
  totalMs: z.number().nonnegative()
});

export type Durations = z.infer<typeof DurationsSchema>;

export const FeatureDeviationSchema = z.object({
  name: z.string(),
  z: z.number()
});

export type FeatureDeviation = z.infer<typeof FeatureDeviationSchema>;

export const AttemptRoleEnum = z.enum([
  'genuine',
  'impostor',
  'imitation',
  'unknown'
]);

export type AttemptRole = z.infer<typeof AttemptRoleEnum>;

export const ExperimentSessionEnum = z.enum(['S1', 'S2', 'S3', 'S4']);
export type ExperimentSession = z.infer<typeof ExperimentSessionEnum>;

export const AttemptSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  ts: z.number().positive(),
  fingerprint: FingerprintResultSchema,
  score: z.number().nullable(),
  tau: z.number(),
  decision: z.enum(['accept', 'reject', 'timeout', 'invalid']),
  failureCounterAfter: z.number().int().nonnegative(),
  durations: DurationsSchema,
  featureDeviations: z.array(FeatureDeviationSchema).optional().default([]),
  flags: z.array(z.string()).default([]),
  role: AttemptRoleEnum.optional().default('unknown'),
  experimentSession: ExperimentSessionEnum.optional()
});

export type Attempt = z.infer<typeof AttemptSchema>;

// ==========================================
// 3. Telemetry Frame (Experiment Mode Only)
// ==========================================

export const FrameSchema = z.object({
  sessionId: z.string().min(1),
  tUs: z.number().nonnegative(),
  force: z.number(),
  gx: z.number(),
  gy: z.number(),
  gz: z.number(),
  ax: z.number(),
  ay: z.number(),
  az: z.number()
});

export type Frame = z.infer<typeof FrameSchema>;

export const FrameBatchSchema = z.object({
  attemptId: z.string().min(1),
  sessionId: z.string().min(1),
  frames: z.array(FrameSchema).min(1)
});

export type FrameBatch = z.infer<typeof FrameBatchSchema>;

// ==========================================
// 4. System Settings & Configuration
// ==========================================

export const SettingsSchema = z.object({
  nFailuresBeforeLockout: z.number().int().min(1).max(20).default(5),
  lockoutBaseSec: z.number().int().min(5).max(300).default(30),
  lockoutEscalation: z.number().min(1.0).max(4.0).default(2.0),
  solenoidHoldMs: z.number().int().min(1000).max(15000).default(5000),
  experimentMode: z.boolean().default(false),
  language: z.enum(['en', 'ar']).optional().default('en')
});

export type Settings = z.infer<typeof SettingsSchema>;

// ==========================================
// 5. Enrollment Profile & ML Model Export
// ==========================================

export const ModelTypeEnum = z.enum([
  'mahalanobis_shrinkage',
  'ocsvm',
  'knn'
]);

export type ModelType = z.infer<typeof ModelTypeEnum>;

export const ProfileMetaSchema = z.object({
  enrolled: z.boolean(),
  trials: z.number().int().nonnegative(),
  modelType: ModelTypeEnum,
  featureSet: z.literal('force+motion'),
  tau: z.number(),
  updatedAt: z.number(),
  version: z.number().int().positive()
});

export type ProfileMeta = z.infer<typeof ProfileMetaSchema>;

export const ModelExportSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  modelType: ModelTypeEnum,
  featureNames: z.array(z.string()),
  mean: z.array(z.number()),
  covInv: z.array(z.array(z.number())),
  scalingMean: z.array(z.number()),
  scalingStd: z.array(z.number()),
  tau: z.number(),
  diagnostics: z.object({
    genuineScores: z.array(z.number()).optional(),
    looScores: z.array(z.number()).optional(),
    trialCounts: z.array(z.number()).optional(),
    stabilityScores: z.array(z.number()).optional()
  }).optional()
});

export type ModelExport = z.infer<typeof ModelExportSchema>;

// ==========================================
// 6. Notifications & Audit Log
// ==========================================

export const NotificationSeverityEnum = z.enum([
  'info',
  'warning',
  'error',
  'success'
]);

export type NotificationSeverity = z.infer<typeof NotificationSeverityEnum>;

export const NotificationSchema = z.object({
  id: z.string().min(1),
  ts: z.number().positive(),
  type: z.string().min(1),
  severity: NotificationSeverityEnum,
  messageKey: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({}),
  read: z.boolean().default(false)
});

export type Notification = z.infer<typeof NotificationSchema>;

// ==========================================
// 7. WebSocket Protocol Messages
// ==========================================

export const WsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe_live'),
    sessionId: z.string().optional()
  }),
  z.object({
    type: z.literal('ping')
  })
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

export const WsServerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), data: SystemStatusSchema }),
  z.object({ type: z.literal('session_start'), sessionId: z.string(), ts: z.number() }),
  z.object({ type: z.literal('frame'), attemptId: z.string(), frames: z.array(FrameSchema) }),
  z.object({ type: z.literal('phase'), phase: z.enum(['S1', 'S2', 'S3', 'S4']), tMs: z.number() }),
  z.object({ type: z.literal('decision'), attempt: AttemptSchema }),
  z.object({ type: z.literal('notification'), notification: NotificationSchema }),
  z.object({ type: z.literal('device_offline'), deviceId: z.string() })
]);

export type WsServerMessage = z.infer<typeof WsServerMessageSchema>;

export const WsDeviceMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), data: SystemStatusSchema }),
  z.object({ type: z.literal('frame'), attemptId: z.string(), frames: z.array(FrameSchema) }),
  z.object({ type: z.literal('attempt'), attempt: AttemptSchema }),
  z.object({ type: z.literal('heartbeat'), ts: z.number() })
]);

export type WsDeviceMessage = z.infer<typeof WsDeviceMessageSchema>;

// ==========================================
// 8. C Header Generator for Firmware
// ==========================================

/**
 * Generates thenar_model.h for compiling on the physical ESP32 firmware.
 * Emits float arrays, dimension constants, and the calibrated threshold tau.
 */
export function generateCHeader(model: ModelExport): string {
  const n = model.featureNames.length;
  const lines: string[] = [];

  lines.push('/* Auto-generated by Thenar Enrollment Toolchain */');
  lines.push('/* Single Source of Truth - Do not edit manually */');
  lines.push('#ifndef THENAR_MODEL_H');
  lines.push('#define THENAR_MODEL_H');
  lines.push('');
  lines.push(`#define THENAR_MODEL_SCHEMA_VERSION ${model.schemaVersion}`);
  lines.push(`#define THENAR_NUM_FEATURES ${n}`);
  lines.push(`#define THENAR_DECISION_TAU ${model.tau.toFixed(6)}f`);
  lines.push('');

  // Feature names comment
  lines.push('/* Feature Order:');
  model.featureNames.forEach((name, i) => {
    lines.push(` * [${i}] ${name}`);
  });
  lines.push(' */');
  lines.push('');

  // Mean vector
  lines.push(`static const float THENAR_FEATURE_MEANS[THENAR_NUM_FEATURES] = {`);
  lines.push(`    ${model.mean.map(v => `${v.toFixed(6)}f`).join(', ')}`);
  lines.push('};');
  lines.push('');

  // Scaling mean & std
  lines.push(`static const float THENAR_SCALING_MEAN[THENAR_NUM_FEATURES] = {`);
  lines.push(`    ${model.scalingMean.map(v => `${v.toFixed(6)}f`).join(', ')}`);
  lines.push('};');
  lines.push('');
  lines.push(`static const float THENAR_SCALING_STD[THENAR_NUM_FEATURES] = {`);
  lines.push(`    ${model.scalingStd.map(v => `${v.toFixed(6)}f`).join(', ')}`);
  lines.push('};');
  lines.push('');

  // Inverse Covariance / Precision matrix
  lines.push(`static const float THENAR_COV_INV[THENAR_NUM_FEATURES][THENAR_NUM_FEATURES] = {`);
  for (let r = 0; r < n; r++) {
    const rowStr = model.covInv[r].map(v => `${v.toFixed(6)}f`).join(', ');
    lines.push(`    { ${rowStr} }${r < n - 1 ? ',' : ''}`);
  }
  lines.push('};');
  lines.push('');
  lines.push('#endif /* THENAR_MODEL_H */');

  return lines.join('\n');
}
