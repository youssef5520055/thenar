/**
 * @file apps/gateway/src/routes/export.ts
 * @description Export endpoints for biometric audit logs and experiment-mode raw telemetry in CSV / JSON formats.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';

/**
 * Safe CSV field sanitization to prevent CSV / Formula Injection (CWE-1236).
 * Any cell value starting with dangerous formula characters (=, +, -, @, \t, \r)
 * is escaped with a leading apostrophe before enclosing in quotes.
 */
function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export const exportRouter = Router();

// GET /api/v1/export/attempts
exportRouter.get('/attempts', (req: Request, res: Response) => {
  const db = getDb();
  const format = (req.query.format as string) === 'json' ? 'json' : 'csv';
  const rows = db.prepare('SELECT * FROM attempts ORDER BY ts DESC').all() as any[];

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="thenar_attempts.json"');
    res.json(rows.map(r => ({
      ...r,
      durations: JSON.parse(r.durationsJson || '{}'),
      featureDeviations: JSON.parse(r.featureDeviationsJson || '[]'),
      flags: JSON.parse(r.flagsJson || '[]')
    })));
    return;
  }

  // Stable CSV Export
  const headers = [
    'id', 'sessionId', 'timestamp_iso', 'fingerprint_result',
    'score', 'tau', 'decision', 'failure_counter',
    'touch_ms', 'peak_force_ms', 'rotation_ms', 'total_ms', 'role', 'session'
  ];

  const csvRows = [headers.join(',')];
  for (const r of rows) {
    const dur = JSON.parse(r.durationsJson || '{}');
    const cols = [
      r.id,
      r.sessionId,
      new Date(r.ts).toISOString(),
      r.fingerprintResult,
      r.score ?? '',
      r.tau,
      r.decision,
      r.failureCounterAfter,
      dur.touchMs ?? '',
      dur.timeToPeakForceMs ?? '',
      dur.rotationMs ?? '',
      dur.totalMs ?? '',
      r.role,
      r.experimentSession ?? ''
    ];
    csvRows.push(cols.map(sanitizeCsvValue).join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="thenar_attempts.csv"');
  res.send(csvRows.join('\n'));
});

// GET /api/v1/export/attempts/:id/frames
exportRouter.get('/attempts/:id/frames', (req: Request, res: Response) => {
  const db = getDb();
  const format = (req.query.format as string) === 'json' ? 'json' : 'csv';
  const rows = db.prepare('SELECT * FROM frames WHERE attemptId = ? ORDER BY tUs ASC').all(req.params.id) as any[];

  if (!rows || rows.length === 0) {
    res.status(404).json({ error: 'No raw frames stored for this attempt.' });
    return;
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="thenar_frames_${req.params.id}.json"`);
    res.json(rows);
    return;
  }

  const headers = ['attemptId', 'sessionId', 't_sec', 't_us', 'force_n', 'gyro_deg_s', 'accel_m_s2'];
  const csvRows = [headers.join(',')];
  for (const r of rows) {
    const cols = [
      r.attemptId,
      r.sessionId,
      (r.tUs / 1000000).toFixed(3),
      r.tUs,
      r.force,
      r.gx,
      r.ax
    ];
    csvRows.push(cols.map(sanitizeCsvValue).join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="thenar_frames_${req.params.id}.csv"`);
  res.send(csvRows.join('\n'));
});
