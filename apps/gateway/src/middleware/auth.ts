/**
 * @file apps/gateway/src/middleware/auth.ts
 * @description Constant-time device token authorization middleware for device endpoints.
 *
 * WHY THIS EXISTS:
 * Protects ingest routes (POST /attempts, POST /status, POST /frames/batch) from unauthorized
 * tampering while preventing timing side-channel attacks on the shared secret token.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';

export function requireDeviceToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-device-token'] as string;
  if (!token) {
    res.status(401).json({ error: 'Missing x-device-token header' });
    return;
  }

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(config.deviceToken);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      next();
      return;
    }
  } catch {
    // Fall through to 401
  }

  res.status(401).json({ error: 'Invalid device token' });
}
