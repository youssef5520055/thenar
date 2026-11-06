/**
 * @file apps/gateway/src/routes/attempts.ts
 * @description Attempt logging, pagination, frame retrieval, and device decision ingest endpoints.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { requireDeviceToken } from '../middleware/auth.js';
import { getWsManager } from '../ws.js';
import { AttemptSchema, FrameBatchSchema } from '@thenar/contracts';

export const attemptsRouter = Router();

// GET /api/v1/attempts
attemptsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const outcome = (req.query.outcome as string) || 'all';
  const from = req.query.from ? Number(req.query.from) : 0;
  const to = req.query.to ? Number(req.query.to) : Infinity;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const cursor = req.query.cursor as string | undefined;

  let query = 'SELECT * FROM attempts WHERE 1=1';
  const params: any[] = [];

  if (outcome === 'accept') {
    query += " AND decision = 'accept'";
  } else if (outcome === 'reject') {
    query += " AND decision = 'reject'";
  } else if (outcome === 'fault') {
    query += " AND (decision = 'invalid' OR decision = 'timeout')";
  }

  if (from > 0) {
    query += ' AND ts >= ?';
    params.push(from);
  }

  if (to < Infinity) {
    query += ' AND ts <= ?';
    params.push(to);
  }

  if (cursor) {
    const cursorTs = Number(cursor);
    if (!Number.isNaN(cursorTs)) {
      query += ' AND ts < ?';
      params.push(cursorTs);
    }
  }

  query += ' ORDER BY ts DESC LIMIT ?';
  params.push(limit + 1);

  const rows = db.prepare(query).all(...params) as any[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].ts) : null;

  const formatted = items.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    ts: Number(r.ts),
    fingerprint: {
      result: r.fingerprintResult,
      templateId: r.fingerprintTemplateId ?? null
    },
    score: r.score !== null ? Number(r.score) : null,
    tau: Number(r.tau),
    decision: r.decision,
    failureCounterAfter: Number(r.failureCounterAfter),
    durations: JSON.parse(r.durationsJson || '{}'),
    featureDeviations: JSON.parse(r.featureDeviationsJson || '[]'),
    flags: JSON.parse(r.flagsJson || '[]'),
    role: r.role,
    experimentSession: r.experimentSession || undefined
  }));

  res.json({
    items: formatted,
    nextCursor,
    totalCount: (db.prepare('SELECT COUNT(*) as count FROM attempts').get() as any).count
  });
});

// GET /api/v1/attempts/:id
attemptsRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM attempts WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: `Attempt ${req.params.id} not found` });
    return;
  }

  res.json({
    id: row.id,
    sessionId: row.sessionId,
    ts: Number(row.ts),
    fingerprint: {
      result: row.fingerprintResult,
      templateId: row.fingerprintTemplateId ?? null
    },
    score: row.score !== null ? Number(row.score) : null,
    tau: Number(row.tau),
    decision: row.decision,
    failureCounterAfter: Number(row.failureCounterAfter),
    durations: JSON.parse(row.durationsJson || '{}'),
    featureDeviations: JSON.parse(row.featureDeviationsJson || '[]'),
    flags: JSON.parse(row.flagsJson || '[]'),
    role: row.role,
    experimentSession: row.experimentSession || undefined
  });
});

// GET /api/v1/attempts/:id/frames
attemptsRouter.get('/:id/frames', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM frames WHERE attemptId = ? ORDER BY tUs ASC').all(req.params.id) as any[];

  if (!rows || rows.length === 0) {
    res.status(404).json({
      error: 'Frames not stored for this attempt.',
      message: 'Raw 100 Hz kinematic frames are recorded exclusively when experimentMode is enabled in Settings to protect owner privacy and reduce storage overhead.'
    });
    return;
  }

  const frames = rows.map((r) => ({
    sessionId: r.sessionId,
    tUs: Number(r.tUs),
    t: Number((r.tUs / 1000000).toFixed(3)),
    force: Number(r.force),
    gyro: Number(r.gx),
    accel: Number(r.ax)
  }));

  res.json({
    attemptId: req.params.id,
    count: frames.length,
    frames
  });
});

// POST /api/v1/attempts (Device Token Protected)
attemptsRouter.post('/', requireDeviceToken, (req: Request, res: Response) => {
  const parsed = AttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Malformed attempt payload', details: parsed.error.issues });
    return;
  }

  const att = parsed.data;
  const db = getDb();

  // Check idempotency
  const existing = db.prepare('SELECT id FROM attempts WHERE id = ?').get(att.id);
  if (existing) {
    res.status(200).json({ success: true, message: 'Attempt already ingested (idempotent)' });
    return;
  }

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
    id: att.id,
    sessionId: att.sessionId,
    ts: att.ts,
    fingerprintResult: att.fingerprint.result,
    fingerprintTemplateId: att.fingerprint.templateId ?? null,
    score: att.score ?? null,
    tau: att.tau,
    decision: att.decision,
    failureCounterAfter: att.failureCounterAfter,
    durationsJson: JSON.stringify(att.durations),
    featureDeviationsJson: JSON.stringify(att.featureDeviations || []),
    flagsJson: JSON.stringify(att.flags),
    role: att.role || 'unknown',
    experimentSession: att.experimentSession ?? null
  });

  // Create notifications and update lock status counter
  let notification: any = null;
  const notifId = `notif_${att.id}_${Date.now()}`;

  if (att.decision === 'accept') {
    notification = {
      id: notifId,
      ts: att.ts,
      type: 'unlock_success',
      severity: 'success',
      messageKey: 'notification.unlock_success',
      payload: { attemptId: att.id },
      read: false
    };
  } else if (att.decision === 'reject') {
    notification = {
      id: notifId,
      ts: att.ts,
      type: 'unlock_fail',
      severity: 'warning',
      messageKey: 'notification.unlock_fail',
      payload: { attemptId: att.id, failureCount: att.failureCounterAfter },
      read: false
    };
  } else if (att.decision === 'invalid' || att.decision === 'timeout') {
    notification = {
      id: notifId,
      ts: att.ts,
      type: 'sensor_fault',
      severity: 'error',
      messageKey: 'notification.sensor_fault',
      payload: { attemptId: att.id, flags: att.flags },
      read: false
    };
  }

  if (notification) {
    db.prepare(`
      INSERT INTO notifications (id, ts, type, severity, messageKey, payloadJson, read)
      VALUES (@id, @ts, @type, @severity, @messageKey, @payloadJson, 0)
    `).run({
      id: notification.id,
      ts: notification.ts,
      type: notification.type,
      severity: notification.severity,
      messageKey: notification.messageKey,
      payloadJson: JSON.stringify(notification.payload)
    });

    getWsManager().broadcastToLive({
      type: 'notification',
      notification
    });
  }

  // Broadcast decision to live subscribers
  getWsManager().broadcastToLive({
    type: 'decision',
    attempt: att
  });

  res.status(201).json({ success: true, id: att.id });
});

// POST /api/v1/frames/batch (Device Token Protected)
attemptsRouter.post('/frames/batch', requireDeviceToken, (req: Request, res: Response) => {
  const parsed = FrameBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Malformed frame batch payload', details: parsed.error.issues });
    return;
  }

  const { attemptId, sessionId, frames } = parsed.data;
  const db = getDb();

  const insertFrame = db.prepare(`
    INSERT INTO frames (attemptId, sessionId, tUs, force, gx, gy, gz, ax, ay, az)
    VALUES (@attemptId, @sessionId, @tUs, @force, @gx, @gy, @gz, @ax, @ay, @az)
  `);

  const insertBatch = db.transaction((frameList) => {
    for (const f of frameList) {
      insertFrame.run({
        attemptId,
        sessionId,
        tUs: f.tUs,
        force: f.force,
        gx: f.gx,
        gy: f.gy,
        gz: f.gz,
        ax: f.ax,
        ay: f.ay,
        az: f.az
      });
    }
  });

  insertBatch(frames);
  res.status(201).json({ success: true, count: frames.length });
});
