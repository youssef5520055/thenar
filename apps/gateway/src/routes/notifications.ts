/**
 * @file apps/gateway/src/routes/notifications.ts
 * @description In-app security notifications and audit event endpoints.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';

export const notificationsRouter = Router();

// GET /api/v1/notifications
notificationsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM notifications ORDER BY ts DESC LIMIT 50').all() as any[];

  const items = rows.map((r) => ({
    id: r.id,
    ts: Number(r.ts),
    type: r.type,
    severity: r.severity,
    messageKey: r.messageKey,
    payload: JSON.parse(r.payloadJson || '{}'),
    read: Boolean(r.read)
  }));

  res.json({ items });
});

// POST /api/v1/notifications/:id/read
notificationsRouter.post('/:id/read', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true, id: req.params.id });
});
