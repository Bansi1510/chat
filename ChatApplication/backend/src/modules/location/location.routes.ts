import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import * as locationService from './location.service';
import { z } from 'zod';

export const locationRouter = Router();

const startLocationSchema = z.object({
  conversationId: z.string(),
  durationSeconds: z.enum(['900', '3600', '28800']).transform((val) => parseInt(val)),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const updateLocationSchema = z.object({
  sessionId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const stopLocationSchema = z.object({
  sessionId: z.string(),
});

locationRouter.post(
  '/location/start',
  requireAuth,
  requirePermission('location.live'),
  validate(startLocationSchema),
  asyncHandler(async (req, res) => {
    const { conversationId, durationSeconds, latitude, longitude } = req.body;
    ok(res, await locationService.startLiveLocation(req.auth!.userId, conversationId, durationSeconds, latitude, longitude), 201);
  })
);

locationRouter.patch(
  '/location/update',
  requireAuth,
  requirePermission('location.live'),
  validate(updateLocationSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, latitude, longitude } = req.body;
    ok(res, await locationService.updateLocation(req.auth!.userId, sessionId, latitude, longitude));
  })
);

locationRouter.post(
  '/location/stop',
  requireAuth,
  validate(stopLocationSchema),
  asyncHandler(async (req, res) => {
    await locationService.stopLocation(req.auth!.userId, req.body.sessionId);
    ok(res, { stopped: true });
  })
);

locationRouter.get(
  '/location/:conversationId',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await locationService.getActiveLocations(req.params.conversationId as string));
  })
);
