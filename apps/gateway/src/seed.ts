/**
 * @file apps/gateway/src/seed.ts
 * @description Seeds the SQLite database with ~40 realistic biometric attempts across sessions S1-S4.
 *
 * WHY THIS EXISTS:
 * Ensures the gateway starts with rich historical telemetry data on first run or when
 * the committee demo is reset, populating the Attempt Log, filter drawers, and charts.
 */

import Database from 'better-sqlite3';
import { Attempt, Notification } from '@thenar/contracts';
import { SeededPRNG } from '@thenar/engine';
import { logger } from './logger.js';

export function seedDatabase(db: Database.Database): void {
  const prng = new SeededPRNG(987654);
  const baseTime = Date.now() - 4 * 24 * 3600 * 1000; // 4 days ago
  const sessions = ['S1', 'S2', 'S3', 'S4'] as const;

  // Clear existing attempt logs and frames
  db.exec('DELETE FROM frames; DELETE FROM attempts; DELETE FROM notifications; DELETE FROM audit_log;');

  const insertAttempt = db.prepare(`
    INSERT INTO attempts (
      id, sessionId, ts, fingerprintResult, fingerprintTemplateId, score, tau,
      decision, failureCounterAfter, durationsJson, featureDeviationsJson,
      flagsJson, role, experimentSession
    ) VALUES (
      @id, @sessionId, @ts, @fingerprintResult, @fingerprintTemplateId, @score, @tau,
      @decision, @failureCounterAfter, @durationsJson, @featureDeviationsJson,
      @flagsJson, @role, @experimentSession
    )
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, ts, type, severity, messageKey, payloadJson, read)
    VALUES (@id, @ts, @type, @severity, @messageKey, @payloadJson, @read)
  `);

  let failureCounter = 0;
  const tau = -3.85;

  for (let i = 0; i < 42; i++) {
    const session = sessions[Math.floor(i / 11)];
    const timeOffset = i * 2.5 * 3600 * 1000 + prng.range(-600000, 600000);
    const ts = Math.round(baseTime + timeOffset);
    const id = `att_seed_${(i + 1).toString().padStart(3, '0')}`;
    const sessionId = `sess_${session}_${Math.floor(i / 5) + 1}`;

    let role: 'genuine' | 'impostor' | 'imitation' | 'unknown' = 'genuine';
    let fpResult: 'accept' | 'reject' | 'capture_fail' = 'accept';
    let decision: 'accept' | 'reject' | 'timeout' | 'invalid' = 'accept';
    let score = Number((-Math.abs(prng.gaussian(2.4, 0.45))).toFixed(2));
    const flags: string[] = [];

    // Construct varied distribution of attempts
    if (i === 12) {
      // Sensor fault / invalid
      decision = 'invalid';
      flags.push('sensor_bus_glitch', 'loadcell_nan');
      score = null;
    } else if (i === 24) {
      // Timeout
      decision = 'timeout';
      flags.push('gesture_incomplete_timeout');
      score = null;
    } else if (i === 18 || i === 19 || i === 20 || i === 21 || i === 22) {
      // Concentrated burst of impostor attempts triggering Lockout
      role = 'impostor';
      fpResult = i === 20 ? 'accept' : 'reject'; // Attempt 20 is silicone spoof bypass of Gate 1
      score = Number((-Math.abs(prng.gaussian(5.8, 0.85))).toFixed(2));
      decision = 'reject';
      failureCounter++;
      if (i === 20) flags.push('gate1_spoof_suspected', 'gate2_blocked');
    } else if (i % 7 === 0) {
      // Occasional random rejection
      role = prng.next() > 0.5 ? 'impostor' : 'imitation';
      fpResult = 'reject';
      score = Number((-Math.abs(prng.gaussian(4.6, 0.75))).toFixed(2));
      decision = 'reject';
      failureCounter++;
    } else {
      // Genuine successful unlock
      role = 'genuine';
      fpResult = 'accept';
      score = Number((-Math.abs(prng.gaussian(2.2, 0.35))).toFixed(2));
      decision = 'accept';
      failureCounter = 0; // reset on success
    }

    const durations = {
      touchMs: Math.round(prng.range(320, 480)),
      timeToPeakForceMs: Math.round(prng.range(750, 950)),
      rotationMs: Math.round(prng.range(550, 720)),
      totalMs: Math.round(prng.range(2100, 2400))
    };

    const featureDeviations = decision === 'reject' && score !== null
      ? [
          { name: 'Peak Grip Force', z: Number(prng.range(2.8, 4.2).toFixed(2)) },
          { name: 'Angular Velocity Excursion', z: Number(prng.range(-3.5, -2.1).toFixed(2)) },
          { name: 'Force-to-Rotation Latency', z: Number(prng.range(2.4, 3.8).toFixed(2)) }
        ]
      : [];

    insertAttempt.run({
      id,
      sessionId,
      ts,
      fingerprintResult: fpResult,
      fingerprintTemplateId: fpResult === 'accept' ? 1 : null,
      score,
      tau,
      decision,
      failureCounterAfter: failureCounter,
      durationsJson: JSON.stringify(durations),
      featureDeviationsJson: JSON.stringify(featureDeviations),
      flagsJson: JSON.stringify(flags),
      role,
      experimentSession: session
    });

    // Create notifications for notable events
    if (decision === 'accept' && i % 10 === 0) {
      insertNotification.run({
        id: `notif_${id}`,
        ts,
        type: 'unlock_success',
        severity: 'success',
        messageKey: 'notification.unlock_success',
        payloadJson: JSON.stringify({ attemptId: id }),
        read: 1
      });
    } else if (decision === 'reject') {
      insertNotification.run({
        id: `notif_${id}`,
        ts,
        type: 'unlock_fail',
        severity: 'warning',
        messageKey: 'notification.unlock_fail',
        payloadJson: JSON.stringify({ attemptId: id, failureCount: failureCounter }),
        read: i < 35 ? 1 : 0
      });
    } else if (decision === 'invalid') {
      insertNotification.run({
        id: `notif_${id}`,
        ts,
        type: 'sensor_fault',
        severity: 'error',
        messageKey: 'notification.sensor_fault',
        payloadJson: JSON.stringify({ attemptId: id, flags }),
        read: 1
      });
    }
  }

  logger.info('Database seeded with 42 historical attempts and notifications.');
}
