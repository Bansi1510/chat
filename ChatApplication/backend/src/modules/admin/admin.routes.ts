import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler, ok } from '../../utils/http';
import {
  clearUserPermission,
  getEffectivePermissions,
  getGlobalPermissions,
  setGlobalPermission,
  setUserPermission,
} from '../permissions/permission.service';
import { PermissionKey } from '../permissions/permissionKeys';
import { recordAudit } from './audit.service';
import * as service from './admin.service';
import { getSettings, updateSettings } from './settings.service';
import {
  enabledBody,
  globalPermissionParams,
  idParam,
  listAuditQuery,
  listUsersQuery,
  updateSettingsBody,
  userPermissionParams,
} from './admin.validators';

export const adminRouter = Router();
adminRouter.use('/admin', requireAuth, requireSuperAdmin);

adminRouter.get(
  '/admin/users',
  validate(listUsersQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    ok(res, await service.listUsers(page, limit, q));
  }),
);

adminRouter.delete(
  '/admin/users/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await service.deleteUser(req.auth!.userId, req.params.id as string);
    ok(res, { deleted: true });
  }),
);

adminRouter.get(
  '/admin/users/:id/permissions',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { role: true, status: true },
    });
    if (!user || user.status !== 'active') throw AppError.notFound('User not found');
    ok(res, await getEffectivePermissions(req.params.id as string, user.role));
  }),
);

adminRouter.put(
  '/admin/users/:id/permissions/:key',
  validate(userPermissionParams, 'params'),
  validate(enabledBody),
  asyncHandler(async (req, res) => {
    const { id, key } = req.params as { id: string; key: PermissionKey };
    const user = await prisma.user.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!user || user.status !== 'active') throw AppError.notFound('User not found');
    await setUserPermission(id, key, req.body.enabled);
    await recordAudit(req.auth!.userId, 'permission.user.set', { type: 'user', id }, { key, enabled: req.body.enabled });
    ok(res, { key, enabled: req.body.enabled });
  }),
);

adminRouter.delete(
  '/admin/users/:id/permissions/:key',
  validate(userPermissionParams, 'params'),
  asyncHandler(async (req, res) => {
    const { id, key } = req.params as { id: string; key: PermissionKey };
    await clearUserPermission(id, key);
    await recordAudit(req.auth!.userId, 'permission.user.clear', { type: 'user', id }, { key });
    ok(res, { cleared: true });
  }),
);

adminRouter.get(
  '/admin/permissions',
  asyncHandler(async (_req, res) => ok(res, await getGlobalPermissions())),
);

adminRouter.put(
  '/admin/permissions/:key',
  validate(globalPermissionParams, 'params'),
  validate(enabledBody),
  asyncHandler(async (req, res) => {
    const key = req.params.key as PermissionKey;
    await setGlobalPermission(key, req.body.enabled);
    await recordAudit(req.auth!.userId, 'permission.global.set', undefined, { key, enabled: req.body.enabled });
    ok(res, { key, enabled: req.body.enabled });
  }),
);

adminRouter.get(
  '/admin/settings',
  asyncHandler(async (_req, res) => ok(res, await getSettings())),
);

adminRouter.patch(
  '/admin/settings',
  validate(updateSettingsBody),
  asyncHandler(async (req, res) => {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
      if (k === 'maxFileSizeMb') {
        for (const [t, n] of Object.entries(v as Record<string, number>)) patch[`maxFileSizeMb.${t}`] = n;
      } else patch[k] = v;
    }
    const updated = await updateSettings(patch);
    await recordAudit(req.auth!.userId, 'settings.update', undefined, { changed: req.body });
    ok(res, updated);
  }),
);

adminRouter.get(
  '/admin/audit-logs',
  validate(listAuditQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, action } = req.query as unknown as { page: number; limit: number; action?: string };
    ok(res, await service.listAudit(page, limit, action));
  }),
);
