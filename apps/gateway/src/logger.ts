/**
 * @file apps/gateway/src/logger.ts
 * @description Structured Pino logger configured with pretty-printing in development.
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    config.environment === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      : undefined
});
