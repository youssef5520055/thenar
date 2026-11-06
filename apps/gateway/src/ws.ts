/**
 * @file apps/gateway/src/ws.ts
 * @description WebSocket server managing `/ws/live` (for companion app subscriptions) and `/ws/device` (for ESP32 device ingest).
 *
 * WHY THIS EXISTS:
 * Enables sub-100ms real-time telemetry streaming from the ESP32 / device simulator to the
 * Companion Web App oscilloscope, while maintaining device authentication and live client broadcasting.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { config } from './config.js';
import { logger } from './logger.js';
import { getDb } from './db.js';
import {
  Attempt,
  Frame,
  Notification,
  SystemStatus,
  Settings
} from '@thenar/contracts';
import crypto from 'crypto';

interface LiveClient {
  ws: WebSocket;
  isAlive: boolean;
}

interface DeviceClient {
  ws: WebSocket;
  deviceId: string;
  isAlive: boolean;
}

export class WebSocketManager {
  private liveServer: WebSocketServer;
  private deviceServer: WebSocketServer;
  private liveClients: Set<LiveClient> = new Set();
  private deviceClients: Set<DeviceClient> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;
  private frameBuffers: Map<string, any[]> = new Map();

  constructor() {
    this.liveServer = new WebSocketServer({ noServer: true });
    this.deviceServer = new WebSocketServer({ noServer: true });

    this.setupLiveServer();
    this.setupDeviceServer();
    this.startHeartbeatCheck();
  }

  public handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): void {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/ws/live') {
      this.liveServer.handleUpgrade(request, socket, head, (ws) => {
        this.liveServer.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/device') {
      // Validate device token
      const token = request.headers['x-device-token'] || url.searchParams.get('token');
      if (!this.isValidDeviceToken(String(token || ''))) {
        logger.warn({ ip: request.socket.remoteAddress }, 'Rejected unauthorized device WebSocket connection');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      this.deviceServer.handleUpgrade(request, socket, head, (ws) => {
        this.deviceServer.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  }

  private isValidDeviceToken(clientToken: string): boolean {
    if (!clientToken || typeof clientToken !== 'string') return false;
    try {
      const a = Buffer.from(clientToken);
      const b = Buffer.from(config.deviceToken);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private setupLiveServer(): void {
    this.liveServer.on('connection', (ws: WebSocket) => {
      const client: LiveClient = { ws, isAlive: true };
      this.liveClients.add(client);
      logger.info({ totalLiveClients: this.liveClients.size }, 'New Web App client connected to /ws/live');

      // Send initial status on connect
      const db = getDb();
      const device = db.prepare('SELECT * FROM devices LIMIT 1').get() as any;
      const lock = db.prepare('SELECT * FROM lock_status WHERE id = 1').get() as any;
      if (device && lock) {
        ws.send(JSON.stringify({
          type: 'status',
          data: {
            device: {
              ...device,
              online: Boolean(device.online)
            },
            lock: {
              ...lock,
              lockoutUntil: lock.lockoutUntil ? Number(lock.lockoutUntil) : null
            }
          }
        }));
      }

      ws.on('pong', () => { client.isAlive = true; });

      ws.on('message', (data: string) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
          }
        } catch {
          // ignore malformed client ping
        }
      });

      ws.on('close', () => {
        this.liveClients.delete(client);
        logger.info({ remainingClients: this.liveClients.size }, 'Web App client disconnected from /ws/live');
      });
    });
  }

  private setupDeviceServer(): void {
    this.deviceServer.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const deviceId = (req.headers['x-device-id'] as string) || 'esp32_device_sim';
      const client: DeviceClient = { ws, deviceId, isAlive: true };
      this.deviceClients.add(client);
      logger.info({ deviceId }, 'Device connected to /ws/device');

      // Mark device online in DB
      const db = getDb();
      db.prepare('UPDATE devices SET online = 1, lastSeenAt = ? WHERE deviceId = ?').run(Date.now(), deviceId);

      // Send active settings configuration to device
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
      if (settings) {
        ws.send(JSON.stringify({
          type: 'config',
          settings: {
            nFailuresBeforeLockout: settings.nFailuresBeforeLockout,
            lockoutBaseSec: settings.lockoutBaseSec,
            lockoutEscalation: settings.lockoutEscalation,
            solenoidHoldMs: settings.solenoidHoldMs,
            experimentMode: Boolean(settings.experimentMode)
          }
        }));
      }

      ws.on('pong', () => { client.isAlive = true; });

      ws.on('message', (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleDeviceMessage(msg);
        } catch (err: any) {
          logger.error({ err: err.message }, 'Failed to parse message from device');
        }
      });

      ws.on('close', () => {
        this.deviceClients.delete(client);
        logger.warn({ deviceId }, 'Device disconnected from /ws/device');
        db.prepare('UPDATE devices SET online = 0, lastSeenAt = ? WHERE deviceId = ?').run(Date.now(), deviceId);
        this.broadcastToLive({ type: 'device_offline', deviceId });
      });
    });
  }

  private handleDeviceMessage(msg: any): void {
    if (msg.type === 'frame') {
      // Broadcast telemetry frames to live subscribers
      this.broadcastToLive({
        type: 'frame',
        attemptId: msg.attemptId,
        frames: msg.frames
      });

      // Buffer frames in memory until attempt record arrives
      if (msg.attemptId && Array.isArray(msg.frames)) {
        if (!this.frameBuffers.has(msg.attemptId)) {
          if (this.frameBuffers.size > 50) {
            const oldestKey = this.frameBuffers.keys().next().value;
            if (oldestKey) this.frameBuffers.delete(oldestKey);
          }
          this.frameBuffers.set(msg.attemptId, []);
        }
        this.frameBuffers.get(msg.attemptId)!.push(...msg.frames);
      }
    } else if (msg.type === 'status') {
      const db = getDb();
      if (msg.data?.lock) {
        db.prepare(`
          UPDATE lock_status SET
            door = @door, bolt = @bolt, solenoid = @solenoid,
            state = @state, failureCount = @failureCount, lockoutUntil = @lockoutUntil
          WHERE id = 1
        `).run({
          ...msg.data.lock,
          lockoutUntil: msg.data.lock.lockoutUntil ?? null
        });
      }
      this.broadcastToLive({ type: 'status', data: msg.data });
    } else if (msg.type === 'attempt') {
      const db = getDb();
      const att = msg.attempt;
      if (att && att.id) {
        const existing = db.prepare('SELECT id FROM attempts WHERE id = ?').get(att.id);
        if (!existing) {
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
            sessionId: att.sessionId || 'session',
            ts: att.ts || Date.now(),
            fingerprintResult: att.fingerprint?.result || 'reject',
            fingerprintTemplateId: att.fingerprint?.templateId ?? null,
            score: att.score ?? null,
            tau: att.tau ?? -3.85,
            decision: att.decision || 'reject',
            failureCounterAfter: att.failureCounterAfter ?? 0,
            durationsJson: JSON.stringify(att.durations || {}),
            featureDeviationsJson: JSON.stringify(att.featureDeviations || []),
            flagsJson: JSON.stringify(att.flags || []),
            role: att.role || 'unknown',
            experimentSession: att.experimentSession ?? null
          });

          // If experimentMode is active, persist buffered frames
          const settings = db.prepare('SELECT experimentMode FROM settings WHERE id = 1').get() as any;
          const buffered = this.frameBuffers.get(att.id);
          if (settings && settings.experimentMode && buffered && buffered.length > 0) {
            const insertFrame = db.prepare(`
              INSERT INTO frames (attemptId, sessionId, tUs, force, gx, gy, gz, ax, ay, az)
              VALUES (@attemptId, @sessionId, @tUs, @force, @gx, @gy, @gz, @ax, @ay, @az)
            `);
            const insertMany = db.transaction((frames: any[]) => {
              for (const f of frames) {
                const tUs = f.tUs !== undefined ? f.tUs : (f.t !== undefined ? Math.round(f.t * 1000000) : 0);
                insertFrame.run({
                  attemptId: att.id,
                  sessionId: f.sessionId || att.sessionId || 'live_session',
                  tUs: Number.isFinite(tUs) ? tUs : 0,
                  force: f.force ?? 0,
                  gx: f.gx ?? f.gyro ?? 0,
                  gy: f.gy ?? 0,
                  gz: f.gz ?? 0,
                  ax: f.ax ?? f.accel ?? 9.81,
                  ay: f.ay ?? 0,
                  az: f.az ?? 0
                });
              }
            });
            insertMany(buffered);
          }
        }
        this.frameBuffers.delete(att.id);
      }
      this.broadcastToLive({ type: 'decision', attempt: msg.attempt });
    }
  }

  public broadcastToLive(message: Record<string, any>): void {
    const payload = JSON.stringify(message);
    for (const client of this.liveClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  public pushConfigToDevices(settings: Settings): void {
    const payload = JSON.stringify({ type: 'config', settings });
    for (const client of this.deviceClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  private startHeartbeatCheck(): void {
    this.pingInterval = setInterval(() => {
      for (const client of this.liveClients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.liveClients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }

      for (const client of this.deviceClients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.deviceClients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }
    }, 15000);
  }

  public close(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.liveServer.close();
    this.deviceServer.close();
  }
}

export let wsManagerInstance: WebSocketManager | null = null;

export function getWsManager(): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
  }
  return wsManagerInstance;
}
