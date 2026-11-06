/**
 * @file apps/gateway/src/server.ts
 * @description HTTP & WebSocket server entry point for the Thenar Gateway service.
 *
 * PURPOSE:
 * Starts the unified HTTP REST and WebSocket server on PORT 3000, connects to SQLite,
 * checks database initialization, and manages graceful shutdowns.
 */

import http from 'http';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { getDb, closeDb } from './db.js';
import { seedDatabase } from './seed.js';
import { getWsManager } from './ws.js';

export function startServer(port = config.port): Promise<http.Server> {
  const app = createApp();
  const server = http.createServer(app);
  const wsManager = getWsManager();

  // Attach WebSocket upgrade handling
  server.on('upgrade', (request, socket, head) => {
    wsManager.handleUpgrade(request, socket, head);
  });

  // Ensure DB schema & seed if fresh
  const db = getDb();
  const attemptCount = (db.prepare('SELECT COUNT(*) as count FROM attempts').get() as any).count;
  if (attemptCount === 0) {
    logger.info('Fresh database detected. Seeding initial attempt records...');
    seedDatabase(db);
  }

  return new Promise((resolve) => {
    server.listen(port, () => {
      logger.info(`Thenar Gateway running at http://localhost:${port}`);
      logger.info(`WebSocket endpoints: ws://localhost:${port}/ws/live and ws://localhost:${port}/ws/device`);
      logger.info(`Swagger API Docs available at http://localhost:${port}/api/docs`);
      resolve(server);
    });
  });
}

// Auto-start if run directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer();

  const shutdown = () => {
    logger.info('Shutting down Gateway server gracefully...');
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
