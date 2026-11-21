import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler, ok } from '../../utils/http';
import * as userService from './user.service';

export const userRouter = Router();

userRouter.post(
  '/users/:id/block',
  requireAuth,
  asyncHandler(async (req, res) => {
    await userService.blockUser(req.auth!.userId, req.params.id as string);
    ok(res, { blocked: true });
  })
);

userRouter.delete(
  '/users/:id/block',
  requireAuth,
  asyncHandler(async (req, res) => {
    await userService.unblockUser(req.auth!.userId, req.params.id as string);
    ok(res, { unblocked: true });
  })
);

userRouter.get(
  '/users/blocked',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await userService.getBlockedUsers(req.auth!.userId));
  })
);
