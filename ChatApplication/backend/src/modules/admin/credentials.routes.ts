import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import { updateSettings } from './settings.service';
import { recordAudit } from './audit.service';
import crypto from 'crypto';
import { env } from '../../config/env';
import { z } from 'zod';

export const credentialsRouter = Router();
credentialsRouter.use('/admin/credentials', requireAuth, requireSuperAdmin);

// Encrypt credentials at rest in MongoDB using AES-256-GCM
function encryptValue(plaintext: string): string {
  const key = Buffer.from(env.SETTINGS_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${enc}`;
}

const credentialsSchema = z.object({
  cloudinary: z.object({
    cloudName: z.string().optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
  }).optional(),
  turn: z.object({
    urls: z.array(z.string()).optional(),
    username: z.string().optional(),
    credential: z.string().optional(),
  }).optional(),
  firebase: z.object({
    projectId: z.string().optional(),
    serverKey: z.string().optional(),
  }).optional(),
});

credentialsRouter.patch(
  '/',
  validate(credentialsSchema),
  asyncHandler(async (req, res) => {
    const encryptedPatch: Record<string, any> = {};
    const raw = req.body;

    if (raw.cloudinary) {
      encryptedPatch['integrations.cloudinary'] = encryptValue(JSON.stringify(raw.cloudinary));
    }
    if (raw.turn) {
      encryptedPatch['integrations.turn'] = encryptValue(JSON.stringify(raw.turn));
    }
    if (raw.firebase) {
      encryptedPatch['integrations.firebase'] = encryptValue(JSON.stringify(raw.firebase));
    }

    await updateSettings(encryptedPatch);
    await recordAudit(req.auth!.userId, 'admin.credentials.update', undefined, { updated: Object.keys(raw) });

    ok(res, { message: 'Integration credentials saved and encrypted securely.' });
  })
);
