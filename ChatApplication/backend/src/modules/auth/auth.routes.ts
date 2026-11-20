import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import { getEffectivePermissions } from '../permissions/permission.service';
import * as service from './auth.service';
import {
  changePasswordSchema,
  changeUsernameSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from './auth.validators';

export const authRouter = Router();

authRouter.post(
  '/auth/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { username, password, deviceName } = req.body;
    ok(res, await service.register(username, password, deviceName), 201);
  }),
);

authRouter.post(
  '/auth/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password, deviceName } = req.body;
    ok(res, await service.login(username, password, deviceName));
  }),
);

authRouter.post(
  '/auth/refresh',
  authLimiter,
  validate(refreshSchema),
  asyncHandler(async (req, res) => ok(res, await service.refresh(req.body.refreshToken))),
);

authRouter.post(
  '/auth/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await service.logout(req.auth!.sessionId);
    ok(res, { loggedOut: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, await service.getProfile(req.auth!.userId))),
);

authRouter.get(
  '/me/permissions',
  requireAuth,
  asyncHandler(async (req, res) =>
    ok(res, await getEffectivePermissions(req.auth!.userId, req.auth!.role)),
  ),
);

authRouter.patch(
  '/me/username',
  requireAuth,
  validate(changeUsernameSchema),
  asyncHandler(async (req, res) => ok(res, await service.changeUsername(req.auth!.userId, req.body.username))),
);

authRouter.patch(
  '/me/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await service.changePassword(req.auth!.userId, req.auth!.sessionId, req.body.currentPassword, req.body.newPassword);
    ok(res, { changed: true });
  }),
);
