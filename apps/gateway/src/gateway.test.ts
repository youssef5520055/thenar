import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { getDb, closeDb } from './db.js';
import { seedDatabase } from './seed.js';
import { config } from './config.js';

describe('Gateway REST API Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    // In-memory or test database
    const db = getDb(':memory:');
    seedDatabase(db);
    app = createApp();
  });

  afterAll(() => {
    closeDb();
  });

  it('GET /health returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('thenar-gateway');
  });

  it('GET /api/v1/status returns valid device and lock status', async () => {
    const res = await request(app).get('/api/v1/status');
    expect(res.status).toBe(200);
    expect(res.body.device).toBeDefined();
    expect(res.body.lock).toBeDefined();
    expect(res.body.lock.door).toBe('closed');
  });

  it('GET /api/v1/attempts returns paginated seed attempts', async () => {
    const res = await request(app).get('/api/v1/attempts?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.totalCount).toBeGreaterThanOrEqual(40);
  });

  it('filters attempts by outcome=accept', async () => {
    const res = await request(app).get('/api/v1/attempts?outcome=accept');
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.decision).toBe('accept');
    }
  });

  it('rejects POST /api/v1/attempts without device token', async () => {
    const res = await request(app)
      .post('/api/v1/attempts')
      .send({ id: 'att_test_unauth' });
    expect(res.status).toBe(401);
  });

  it('accepts POST /api/v1/attempts with valid device token', async () => {
    const validAttempt = {
      id: 'att_test_ingest_01',
      sessionId: 'sess_test_1',
      ts: Date.now(),
      fingerprint: { result: 'accept', templateId: 1 },
      score: -2.35,
      tau: -3.85,
      decision: 'accept',
      failureCounterAfter: 0,
      durations: { touchMs: 380, timeToPeakForceMs: 840, rotationMs: 620, totalMs: 2150 },
      featureDeviations: [],
      flags: ['unit_test'],
      role: 'genuine'
    };

    const res = await request(app)
      .post('/api/v1/attempts')
      .set('x-device-token', config.deviceToken)
      .send(validAttempt);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(validAttempt.id);

    // Verify it appears in GET /api/v1/attempts/:id
    const getRes = await request(app).get(`/api/v1/attempts/${validAttempt.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(validAttempt.id);
  });

  it('GET and PUT /api/v1/settings works and validates fields', async () => {
    const getRes = await request(app).get('/api/v1/settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.nFailuresBeforeLockout).toBe(5);

    const putRes = await request(app)
      .put('/api/v1/settings')
      .send({
        nFailuresBeforeLockout: 7,
        lockoutBaseSec: 45,
        lockoutEscalation: 2.5,
        solenoidHoldMs: 6000,
        experimentMode: true,
        language: 'ar'
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.settings.nFailuresBeforeLockout).toBe(7);
    expect(putRes.body.settings.experimentMode).toBe(true);
  });

  it('GET /api/v1/export/attempts?format=csv returns proper CSV headers', async () => {
    const res = await request(app).get('/api/v1/export/attempts?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('id,sessionId,timestamp_iso,fingerprint_result');
  });

  it('POST /api/v1/demo/simulate triggers an owner unlock and records attempt', async () => {
    const res = await request(app)
      .post('/api/v1/demo/simulate')
      .send({ scenario: 'owner-unlock' });
    expect(res.status).toBe(200);
    expect(res.body.attempt.decision).toBe('accept');
    expect(res.body.attempt.role).toBe('genuine');
  });

  it('GET /api/v1/analytics/summary returns honest null placeholders', async () => {
    const res = await request(app).get('/api/v1/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body.eer).toBeNull();
    expect(res.body.rocCurve).toBeNull();
    expect(res.body.status).toBe('pending_lab_benchmarks');
  });
});
