/**
 * @file apps/gateway/src/routes/analytics.ts
 * @description Analytics summary endpoint. Returns honest null placeholders pending physical lab data collection.
 */

import { Router, Request, Response } from 'express';

export const analyticsRouter = Router();

// GET /api/v1/analytics/summary
analyticsRouter.get('/summary', (req: Request, res: Response) => {
  res.json({
    confusionMatrix: null,
    rocCurve: null,
    detCurve: null,
    eer: null,
    auc: null,
    status: 'pending_lab_benchmarks',
    message: 'Analytics indicators remain honest null/placeholder dashes until multi-subject laboratory trials are finalized.'
  });
});
