import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/errorHandling';
import { asyncHandler, ok } from '../../utils/http';
import * as chatService from './chat.service';
import { z } from 'zod';

export const chatRouter = Router();

const sendMessageSchema = z.object({
  conversationId: z.string(),
  clientMsgId: z.string(),
  ciphertext: z.string(),
  type: z.enum(['text', 'image', 'video', 'document', 'audio', 'voice', 'location', 'system']).optional(),
  mediaUrl: z.string().optional(),
  mediaMeta: z.any().optional(),
  replyToId: z.string().optional(),
  forwarded: z.boolean().optional(),
  isScheduled: z.boolean().optional(),
  scheduledFor: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
});

const reactSchema = z.object({
  emoji: z.string().max(10),
});

const settingsSchema = z.object({
  disappearingSeconds: z.number().int().min(0).optional(),
  pinned: z.boolean().optional(),
  muted: z.boolean().optional(),
  wallpaper: z.string().optional(),
});

chatRouter.get(
  '/conversations',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await chatService.getConversations(req.auth!.userId));
  })
);

chatRouter.get(
  '/conversations/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const before = req.query.before as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    ok(res, await chatService.getMessages(req.auth!.userId, req.params.id as string, before, limit));
  })
);

chatRouter.post(
  '/messages',
  requireAuth,
  requirePermission('chat.text'),
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    ok(res, await chatService.sendMessage(req.auth!.userId, req.body), 201);
  })
);

chatRouter.post(
  '/messages/:id/react',
  requireAuth,
  requirePermission('chat.react'),
  validate(reactSchema),
  asyncHandler(async (req, res) => {
    await chatService.reactToMessage(req.auth!.userId, req.params.id as string, req.body.emoji);
    ok(res, { success: true });
  })
);

chatRouter.delete(
  '/messages/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const forEveryone = req.query.forEveryone === 'true';
    ok(res, await chatService.deleteMessage(req.auth!.userId, req.params.id as string, forEveryone));
  })
);

chatRouter.patch(
  '/conversations/:id/settings',
  requireAuth,
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    await chatService.updateConversationSettings(req.auth!.userId, req.params.id as string, req.body);
    ok(res, { success: true });
  })
);
