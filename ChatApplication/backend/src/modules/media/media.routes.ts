import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import * as mediaService from './media.service';
import { z } from 'zod';

export const mediaRouter = Router();

const verifyMediaSchema = z.object({
  fileSizeBytes: z.number().int().positive(),
  fileType: z.string().min(1),
});

mediaRouter.post(
  '/media/sign-upload',
  requireAuth,
  requirePermission('chat.media'),
  asyncHandler(async (req, res) => {
    ok(res, await mediaService.generateUploadSignature(req.auth!.userId));
  })
);

mediaRouter.post(
  '/media/verify',
  requireAuth,
  validate(verifyMediaSchema),
  asyncHandler(async (req, res) => {
    ok(res, await mediaService.verifyMediaUpload(req.body.fileSizeBytes, req.body.fileType));
  })
);
