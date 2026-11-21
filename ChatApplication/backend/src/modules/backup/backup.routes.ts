import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import * as backupService from './backup.service';
import { z } from 'zod';

export const backupRouter = Router();

const uploadBackupSchema = z.object({
  backupHash: z.string().length(64),
  sizeBytes: z.number().int().positive(),
  encryptedBlob: z.string().min(1),
});

backupRouter.post(
  '/backup/upload',
  requireAuth,
  requirePermission('backup.use'),
  validate(uploadBackupSchema),
  asyncHandler(async (req, res) => {
    const { backupHash, sizeBytes, encryptedBlob } = req.body;
    ok(res, await backupService.uploadBackup(req.auth!.userId, backupHash, sizeBytes, encryptedBlob), 201);
  })
);

backupRouter.get(
  '/backup/latest',
  requireAuth,
  requirePermission('backup.use'),
  asyncHandler(async (req, res) => {
    ok(res, await backupService.getLatestBackup(req.auth!.userId));
  })
);

backupRouter.get(
  '/backup/download',
  requireAuth,
  requirePermission('backup.use'),
  asyncHandler(async (req, res) => {
    ok(res, await backupService.downloadBackup(req.auth!.userId));
  })
);
