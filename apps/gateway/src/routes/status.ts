/**
 * @file apps/gateway/src/routes/status.ts
 * @description Status routes for querying combined device & lock status, and receiving device heartbeats.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { requireDeviceToken } from '../middleware/auth.js';
import { getWsManager } from '../ws.js';
import { SystemStatusSchema, LockStatusSchema, DeviceSchema } from '@thenar/contracts';

export const statusRouter = Router();

// GET /api/v1/status
statusRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const deviceRow = db.prepare('SELECT * FROM devices LIMIT 1').get() as any;
  const lockRow = db.prepare('SELECT * FROM lock_status WHERE id = 1').get() as any;

  if (!deviceRow || !lockRow) {
    res.status(503).json({ error: 'System status not initialized' });
    return;
  }

  const status = {
    device: {
      ...deviceRow,
      online: Boolean(deviceRow.online)
    },
    lock: {
      ...lockRow,
      lockoutUntil: lockRow.lockoutUntil ? Number(lockRow.lockoutUntil) : null
    }
  };

  const parsed = SystemStatusSchema.safeParse(status);
  if (!parsed.success) {
    res.status(500).json({ error: 'Corrupt status data', details: parsed.error.issues });
    return;
  }

  res.json(parsed.data);
});

// POST /api/v1/status (Device Token Protected)
statusRouter.post('/', requireDeviceToken, (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (body.device) {
    const dev = body.device;
    db.prepare(`
      INSERT INTO devices (deviceId, firmwareVersion, hardwareRevision, wifiSsid, rssi, ip, uptimeSec, online, lastSeenAt)
      VALUES (@deviceId, @firmwareVersion, @hardwareRevision, @wifiSsid, @rssi, @ip, @uptimeSec, @online, @lastSeenAt)
      ON CONFLICT(deviceId) DO UPDATE SET
        firmwareVersion = excluded.firmwareVersion,
        hardwareRevision = excluded.hardwareRevision,
        wifiSsid = excluded.wifiSsid,
        rssi = excluded.rssi,
        ip = excluded.ip,
        uptimeSec = excluded.uptimeSec,
        online = excluded.online,
        lastSeenAt = excluded.lastSeenAt
    `).run({
      deviceId: dev.deviceId || 'thenar_esp32_dev_01',
      firmwareVersion: dev.firmwareVersion || 'v1.0.0-esp32',
      hardwareRevision: dev.hardwareRevision || 'rev-B',
      wifiSsid: dev.wifiSsid || 'Thenar-Safe-Net',
      rssi: dev.rssi || -60,
      ip: dev.ip || '192.168.4.1',
      uptimeSec: dev.uptimeSec || 0,
      online: dev.online ? 1 : 0,
      lastSeenAt: Date.now()
    });
  }

  if (body.lock) {
    const lk = body.lock;
    db.prepare(`
      UPDATE lock_status SET
        door = @door, bolt = @bolt, solenoid = @solenoid,
        state = @state, failureCount = @failureCount, lockoutUntil = @lockoutUntil
      WHERE id = 1
    `).run({
      door: lk.door || 'closed',
      bolt: lk.bolt || 'extended',
      solenoid: lk.solenoid || 'off',
      state: lk.state || 'idle',
      failureCount: lk.failureCount ?? 0,
      lockoutUntil: lk.lockoutUntil ?? null
    });
  }

  // Broadcast updated status to live Web App clients
  getWsManager().broadcastToLive({
    type: 'status',
    data: body
  });

  res.json({ success: true, timestamp: Date.now() });
});
