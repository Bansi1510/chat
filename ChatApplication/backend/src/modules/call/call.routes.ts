import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import * as callService from './call.service';
import { z } from 'zod';

export const callRouter = Router();

const logCallSchema = z.object({
  calleeId: z.string(),
  callType: z.enum(['audio', 'video']),
  status: z.enum(['completed', 'missed', 'rejected', 'busy', 'failed']),
  durationSeconds: z.number().int().min(0).optional(),
  startedAt: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  endedAt: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
});

callRouter.get(
  '/calls/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    ok(res, await callService.getCallHistory(req.auth!.userId, page, limit));
  })
);

callRouter.post(
  '/calls/log',
  requireAuth,
  validate(logCallSchema),
  asyncHandler(async (req, res) => {
    ok(res, await callService.logCall(req.auth!.userId, req.body), 201);
  })
);

callRouter.get(
  '/calls/turn-credentials',
  requireAuth,
  asyncHandler(async (_req, res) => {
    ok(res, await callService.getTurnCredentials());
  })
);
