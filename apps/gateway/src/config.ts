/**
 * @file apps/gateway/src/config.ts
 * @description Centralized environment configuration and security token constants for the Gateway service.
 *
 * WHY THIS EXISTS:
 * Ensures all environment-dependent variables (ports, shared device tokens, SQLite paths, and service URLs)
 * are typed, validated, and given safe local development defaults.
 */

export const config = {
  port: Number(process.env.PORT || 3000),
  deviceToken: process.env.DEVICE_TOKEN || 'thenar-device-secret-2026',
  enrollmentServiceUrl: process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:8000',
  dbPath: process.env.DB_PATH || 'thenar.sqlite',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  environment: process.env.NODE_ENV || 'development'
};
