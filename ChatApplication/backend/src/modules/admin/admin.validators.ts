import { z } from 'zod';
import { PERMISSION_KEYS } from '../permissions/permissionKeys';

const permissionKey = z.enum(PERMISSION_KEYS);
const idSchema = z.string().regex(/^[a-f0-9-]{24,36}$/i, 'Invalid id');

export const idParam = z.object({ id: idSchema });
export const userPermissionParams = z.object({ id: idSchema, key: permissionKey });
export const globalPermissionParams = z.object({ key: permissionKey });
export const enabledBody = z.object({ enabled: z.boolean() });

export const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(30).optional(),
});

export const listAuditQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().max(60).optional(),
});

const mb = z.number().int().min(1).max(2048);
export const updateSettingsBody = z
  .object({
    qrExpirySeconds: z.number().int().min(60),
    maxFileSizeMb: z.object({ image: mb, video: mb, document: mb, audio: mb }).partial(),
    backupIntervalHours: z.number().int().min(1).max(720),
    unreadReminderMinutes: z.number().int().min(1).max(10080),
    maxLoginAttempts: z.number().int().min(3).max(20),
    loginLockMinutes: z.number().int().min(1).max(1440),
  })
  .partial()
  .strict();
