/**
 * @file apps/gateway/src/db.ts
 * @description SQLite database persistence layer using better-sqlite3 with WAL mode enabled.
 *
 * WHY THIS EXISTS:
 * Provides crash-resilient, zero-configuration local relational persistence for attempt audit logs,
 * telemetry frames (in experiment mode), device state, system settings, and notifications.
 */

import Database from 'better-sqlite3';
import { config } from './config.js';
import { logger } from './logger.js';

let dbInstance: Database.Database | null = null;

export function getDb(customPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(customPath || config.dbPath);
  
  // Performance & safety pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);

  dbInstance = db;
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}

/**
 * Creates schema tables, indexes, and default single-row configurations if not present.
 */
export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      deviceId TEXT PRIMARY KEY,
      firmwareVersion TEXT NOT NULL,
      hardwareRevision TEXT NOT NULL,
      wifiSsid TEXT NOT NULL,
      rssi INTEGER NOT NULL,
      ip TEXT NOT NULL,
      uptimeSec REAL NOT NULL,
      online INTEGER NOT NULL DEFAULT 1,
      lastSeenAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lock_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      door TEXT NOT NULL DEFAULT 'closed',
      bolt TEXT NOT NULL DEFAULT 'extended',
      solenoid TEXT NOT NULL DEFAULT 'off',
      state TEXT NOT NULL DEFAULT 'idle',
      failureCount INTEGER NOT NULL DEFAULT 0,
      lockoutUntil INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      ts INTEGER NOT NULL,
      fingerprintResult TEXT NOT NULL,
      fingerprintTemplateId INTEGER,
      score REAL,
      tau REAL NOT NULL,
      decision TEXT NOT NULL,
      failureCounterAfter INTEGER NOT NULL,
      durationsJson TEXT NOT NULL,
      featureDeviationsJson TEXT NOT NULL,
      flagsJson TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'unknown',
      experimentSession TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_ts ON attempts(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_attempts_decision ON attempts(decision);

    CREATE TABLE IF NOT EXISTS frames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attemptId TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      tUs INTEGER NOT NULL,
      force REAL NOT NULL,
      gx REAL NOT NULL,
      gy REAL NOT NULL,
      gz REAL NOT NULL,
      ax REAL NOT NULL,
      ay REAL NOT NULL,
      az REAL NOT NULL,
      FOREIGN KEY (attemptId) REFERENCES attempts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_frames_attemptId ON frames(attemptId);

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nFailuresBeforeLockout INTEGER NOT NULL DEFAULT 5,
      lockoutBaseSec INTEGER NOT NULL DEFAULT 30,
      lockoutEscalation REAL NOT NULL DEFAULT 2.0,
      solenoidHoldMs INTEGER NOT NULL DEFAULT 5000,
      experimentMode INTEGER NOT NULL DEFAULT 0,
      language TEXT NOT NULL DEFAULT 'en'
    );

    CREATE TABLE IF NOT EXISTS profile_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enrolled INTEGER NOT NULL DEFAULT 0,
      trials INTEGER NOT NULL DEFAULT 0,
      modelType TEXT NOT NULL DEFAULT 'mahalanobis_shrinkage',
      featureSet TEXT NOT NULL DEFAULT 'force+motion',
      tau REAL NOT NULL DEFAULT -3.85,
      updatedAt INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      modelExportJson TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      messageKey TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_ts ON notifications(ts DESC);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      detailsJson TEXT NOT NULL
    );
  `);

  // Ensure initial single-row defaults exist
  const hasLock = db.prepare('SELECT id FROM lock_status WHERE id = 1').get();
  if (!hasLock) {
    db.prepare(`
      INSERT INTO lock_status (id, door, bolt, solenoid, state, failureCount, lockoutUntil)
      VALUES (1, 'closed', 'extended', 'off', 'idle', 0, NULL)
    `).run();
  }

  const hasSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!hasSettings) {
    db.prepare(`
      INSERT INTO settings (id, nFailuresBeforeLockout, lockoutBaseSec, lockoutEscalation, solenoidHoldMs, experimentMode, language)
      VALUES (1, 5, 30, 2.0, 5000, 0, 'en')
    `).run();
  }

  const hasProfile = db.prepare('SELECT id FROM profile_meta WHERE id = 1').get();
  if (!hasProfile) {
    db.prepare(`
      INSERT INTO profile_meta (id, enrolled, trials, modelType, featureSet, tau, updatedAt, version, modelExportJson)
      VALUES (1, 1, 5, 'mahalanobis_shrinkage', 'force+motion', -3.85, ${Date.now()}, 1, NULL)
    `).run();
  }

  const hasDevice = db.prepare('SELECT deviceId FROM devices LIMIT 1').get();
  if (!hasDevice) {
    db.prepare(`
      INSERT INTO devices (deviceId, firmwareVersion, hardwareRevision, wifiSsid, rssi, ip, uptimeSec, online, lastSeenAt)
      VALUES ('thenar_esp32_dev_01', 'v1.0.0-esp32', 'rev-B', 'Thenar-Safe-Net', -58, '192.168.4.1', 7200, 1, ${Date.now()})
    `).run();
  }
}
