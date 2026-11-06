/**
 * @file apps/gateway/src/routes/settings.ts
 * @description Settings configuration routes with live push to connected devices over WebSocket.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { getWsManager } from '../ws.js';
import { SettingsSchema } from '@thenar/contracts';

export const settingsRouter = Router();

// GET /api/v1/settings
settingsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;

  if (!row) {
    res.status(503).json({ error: 'Settings not initialized' });
    return;
  }

  const settings = {
    nFailuresBeforeLockout: Number(row.nFailuresBeforeLockout),
    lockoutBaseSec: Number(row.lockoutBaseSec),
    lockoutEscalation: Number(row.lockoutEscalation),
    solenoidHoldMs: Number(row.solenoidHoldMs),
    experimentMode: Boolean(row.experimentMode),
    language: (row.language as 'en' | 'ar') || 'en'
  };

  res.json(settings);
});

// PUT /api/v1/settings
settingsRouter.put('/', (req: Request, res: Response) => {
  const parsed = SettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid settings payload', details: parsed.error.issues });
    return;
  }

  const s = parsed.data;
  const db = getDb();

  db.prepare(`
    UPDATE settings SET
      nFailuresBeforeLockout = @nFailuresBeforeLockout,
      lockoutBaseSec = @lockoutBaseSec,
      lockoutEscalation = @lockoutEscalation,
      solenoidHoldMs = @solenoidHoldMs,
      experimentMode = @experimentMode,
      language = @language
    WHERE id = 1
  `).run({
    nFailuresBeforeLockout: s.nFailuresBeforeLockout,
    lockoutBaseSec: s.lockoutBaseSec,
    lockoutEscalation: s.lockoutEscalation,
    solenoidHoldMs: s.solenoidHoldMs,
    experimentMode: s.experimentMode ? 1 : 0,
    language: s.language || 'en'
  });

  // Push new config to connected ESP32 / device simulator
  getWsManager().pushConfigToDevices(s);

  res.json({ success: true, settings: s });
});
