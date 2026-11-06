/**
 * @file apps/gateway/src/routes/profile.ts
 * @description Profile management and offline model fitting proxy to the Python Enrollment service.
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { ProfileMetaSchema, ModelExportSchema } from '@thenar/contracts';

export const profileRouter = Router();

// GET /api/v1/profile
profileRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profile_meta WHERE id = 1').get() as any;

  if (!row) {
    res.status(503).json({ error: 'Profile not initialized' });
    return;
  }

  const profile = {
    enrolled: Boolean(row.enrolled),
    trials: Number(row.trials),
    modelType: row.modelType,
    featureSet: row.featureSet,
    tau: Number(row.tau),
    updatedAt: Number(row.updatedAt),
    version: Number(row.version)
  };

  res.json(profile);
});

// POST /api/v1/profile/enroll
profileRouter.post('/enroll', async (req: Request, res: Response) => {
  const { trials, percentile = 5, model = 'mahalanobis_shrinkage' } = req.body;

  if (!Array.isArray(trials) || trials.length < 3) {
    res.status(400).json({
      error: 'Insufficient calibration trials.',
      message: 'A minimum of 3 genuine trials (5 recommended) is required to fit the shrinkage covariance matrix.'
    });
    return;
  }

  try {
    // Proxy fit request to Python Enrollment Service
    const fitRes = await fetch(`${config.enrollmentServiceUrl}/fit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trials, percentile, model })
    });

    if (!fitRes.ok) {
      const errBody = await fitRes.text();
      res.status(fitRes.status).json({ error: 'Enrollment service fit failed', details: errBody });
      return;
    }

    const modelExport = await fitRes.json();
    const db = getDb();

    db.prepare(`
      UPDATE profile_meta SET
        enrolled = 1,
        trials = @trials,
        modelType = @modelType,
        tau = @tau,
        updatedAt = @updatedAt,
        version = version + 1,
        modelExportJson = @modelExportJson
      WHERE id = 1
    `).run({
      trials: trials.length,
      modelType: model,
      tau: modelExport.tau,
      updatedAt: Date.now(),
      modelExportJson: JSON.stringify(modelExport)
    });

    logger.info({ tau: modelExport.tau, trials: trials.length }, 'Owner profile successfully fitted & saved');
    res.json(modelExport);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to communicate with Enrollment service');
    res.status(502).json({
      error: 'Enrollment service offline',
      message: 'Could not connect to Python FastAPI service at ' + config.enrollmentServiceUrl
    });
  }
});

// POST /api/v1/profile/reset
profileRouter.post('/reset', (req: Request, res: Response) => {
  const { confirm } = req.body;
  if (confirm !== 'RESET_PROFILE') {
    res.status(400).json({ error: 'Confirmation token "RESET_PROFILE" required to clear profile.' });
    return;
  }

  const db = getDb();
  db.prepare(`
    UPDATE profile_meta SET
      enrolled = 0,
      trials = 0,
      tau = -3.85,
      updatedAt = @updatedAt,
      version = version + 1,
      modelExportJson = NULL
    WHERE id = 1
  `).run({
    updatedAt: Date.now()
  });

  logger.warn('Owner biometric profile has been reset');
  res.json({ success: true, message: 'Profile reset successfully' });
});
