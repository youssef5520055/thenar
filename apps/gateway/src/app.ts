/**
 * @file apps/gateway/src/app.ts
 * @description Express application setup, security headers, CORS, API v1 routing, and Swagger UI documentation.
 *
 * WHY THIS EXISTS:
 * Centralizes HTTP pipeline middleware, route registration, and error handling for the Gateway service.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { logger } from './logger.js';
import { statusRouter } from './routes/status.js';
import { attemptsRouter } from './routes/attempts.js';
import { settingsRouter } from './routes/settings.js';
import { profileRouter } from './routes/profile.js';
import { notificationsRouter } from './routes/notifications.js';
import { exportRouter } from './routes/export.js';
import { demoRouter } from './routes/demo.js';
import { analyticsRouter } from './routes/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Application {
  const app = express();

  // Security & Cross-Origin
  app.use(helmet({
    contentSecurityPolicy: false // Allows inline docs viewer
  }));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '2mb' }));

  // Health checks
  app.get(['/health', '/api/v1/health'], (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'thenar-gateway',
      timestamp: Date.now(),
      uptimeSec: Math.floor(process.uptime())
    });
  });

  // API v1 Routing
  const v1 = express.Router();
  v1.use('/status', statusRouter);
  v1.use('/attempts', attemptsRouter);
  v1.use('/settings', settingsRouter);
  v1.use('/profile', profileRouter);
  v1.use('/notifications', notificationsRouter);
  v1.use('/export', exportRouter);
  v1.use('/demo', demoRouter);
  v1.use('/analytics', analyticsRouter);

  app.use('/api/v1', v1);

  // Serve raw OpenAPI YAML
  app.get('/openapi.yaml', (req: Request, res: Response) => {
    const yamlPath = path.resolve(__dirname, '../../../packages/contracts/openapi.yaml');
    if (fs.existsSync(yamlPath)) {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(fs.readFileSync(yamlPath, 'utf-8'));
    } else {
      res.status(404).send('OpenAPI spec not found');
    }
  });

  // Serve Swagger UI Interactive Docs at /api/docs
  app.get('/api/docs', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Thenar Gateway API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
        <style>body { margin: 0; background: #fafafa; font-family: sans-serif; }</style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            SwaggerUIBundle({
              url: '/openapi.yaml',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [SwaggerUIBundle.presets.apis],
            });
          };
        </script>
      </body>
      </html>
    `);
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err: err.message, stack: err.stack }, 'Unhandled API Exception');
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });

  return app;
}
