/**
 * @file apps/gateway/src/routes/demo.ts
 * @description Demo simulation and database reset routes for one-command presentations.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { seedDatabase } from '../seed.js';
import { getWsManager } from '../ws.js';
import {
  generateAttemptFrames,
  extractFeatures,
  computeMahalanobisScore,
  evaluateDualGate
} from '@thenar/engine';
import { Attempt } from '@thenar/contracts';

export const demoRouter = Router();

// POST /api/v1/demo/simulate
demoRouter.post('/simulate', async (req: Request, res: Response) => {
  const scenario = req.body.scenario || 'owner-unlock';
  const ws = getWsManager();
  const db = getDb();

  const attemptId = `att_demo_${Date.now()}`;
  const sessionId = `sess_demo_${Math.floor(Math.random() * 9000 + 1000)}`;

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
    // SPOOF VECTOR: Silicon gel replica bypassed Gate 1, but kinematics differ
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

  // 1. Notify session start
  ws.broadcastToLive({
    type: 'session_start',
    sessionId,
    ts: Date.now()
  });

  // 2. Synthesize frames
  const frames = generateAttemptFrames(engineScenario, Date.now(), scenario === 'sensor-fault');

  // 3. Stream frames in small batches to simulate 100 Hz wire arrival
  const batchSize = 15;
  for (let i = 0; i < frames.length; i += batchSize) {
    const chunk = frames.slice(i, i + batchSize);
    ws.broadcastToLive({
      type: 'frame',
      attemptId,
      frames: chunk
    });
  }

  // 4. Feature extraction & Scoring
  const features = extractFeatures(frames);
  const { score, deviations } = computeMahalanobisScore(features);

  const profileRow = db.prepare('SELECT tau FROM profile_meta WHERE id = 1').get() as any;
  const tau = profileRow ? Number(profileRow.tau) : -3.85;

  let decision: 'accept' | 'reject' | 'timeout' | 'invalid' = 'accept';
  if (scenario === 'sensor-fault') {
    decision = 'invalid';
  } else {
    const evaluation = evaluateDualGate(fpMatch, score, tau);
    decision = evaluation.accepted ? 'accept' : 'reject';
  }

  // 5. Update lock status and failure counter
  const lockRow = db.prepare('SELECT * FROM lock_status WHERE id = 1').get() as any;
  let failureCount = lockRow.failureCount;
  let lockoutUntil: number | null = lockRow.lockoutUntil;
  let lockState = lockRow.state;

  if (decision === 'accept') {
    failureCount = 0;
    lockState = 'accept';
  } else if (decision === 'reject') {
    failureCount++;
    const settings = db.prepare('SELECT nFailuresBeforeLockout, lockoutBaseSec, lockoutEscalation FROM settings WHERE id = 1').get() as any;
    if (failureCount >= settings.nFailuresBeforeLockout) {
      lockState = 'lockout';
      lockoutUntil = Date.now() + settings.lockoutBaseSec * 1000;
    } else {
      lockState = 'reject';
    }
  }

  db.prepare(`
    UPDATE lock_status SET
      failureCount = @failureCount,
      lockoutUntil = @lockoutUntil,
      state = @lockState
    WHERE id = 1
  `).run({ failureCount, lockoutUntil, lockState });

  // 6. Persist attempt record
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
    role
  };

  db.prepare(`
    INSERT INTO attempts (
      id, sessionId, ts, fingerprintResult, fingerprintTemplateId, score, tau,
      decision, failureCounterAfter, durationsJson, featureDeviationsJson,
      flagsJson, role, experimentSession
    ) VALUES (
      @id, @sessionId, @ts, @fingerprintResult, @fingerprintTemplateId, @score, @tau,
      @decision, @failureCounterAfter, @durationsJson, @featureDeviationsJson,
      @flagsJson, @role, @experimentSession
    )
  `).run({
    id: attemptRecord.id,
    sessionId: attemptRecord.sessionId,
    ts: attemptRecord.ts,
    fingerprintResult: attemptRecord.fingerprint.result,
    fingerprintTemplateId: attemptRecord.fingerprint.templateId,
    score: attemptRecord.score,
    tau: attemptRecord.tau,
    decision: attemptRecord.decision,
    failureCounterAfter: attemptRecord.failureCounterAfter,
    durationsJson: JSON.stringify(attemptRecord.durations),
    featureDeviationsJson: JSON.stringify(attemptRecord.featureDeviations),
    flagsJson: JSON.stringify(attemptRecord.flags),
    role: attemptRecord.role,
    experimentSession: 'S4'
  });

  // 7. Broadcast decision
  ws.broadcastToLive({
    type: 'decision',
    attempt: attemptRecord
  });

  res.json({ success: true, attempt: attemptRecord });
});

// POST /api/v1/demo/reset
demoRouter.post('/reset', (req: Request, res: Response) => {
  const db = getDb();
  seedDatabase(db);
  res.json({ success: true, message: 'Database reset and seeded with 42 historical attempts.' });
});
