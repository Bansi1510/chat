import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import * as qrService from './qr.service';
import { z } from 'zod';

export const qrRouter = Router();

const scanSchema = z.object({
  token: z.string().min(1),
});

qrRouter.get(
  '/qr',
  requireAuth,
  requirePermission('qr.use'),
  asyncHandler(async (req, res) => {
    ok(res, await qrService.generateQRToken(req.auth!.userId));
  })
);

qrRouter.post(
  '/qr/regenerate',
  requireAuth,
  requirePermission('qr.use'),
  asyncHandler(async (req, res) => {
    ok(res, await qrService.generateQRToken(req.auth!.userId));
  })
);

qrRouter.post(
  '/qr/scan',
  requireAuth,
  requirePermission('qr.use'),
  validate(scanSchema),
  asyncHandler(async (req, res) => {
    ok(res, await qrService.scanQRToken(req.auth!.userId, req.body.token));
  })
);

qrRouter.get(
  '/connections',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await qrService.getUserConnections(req.auth!.userId));
  })
);
