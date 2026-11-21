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

chatRouter.get(
  '/conversations/:id/media',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await chatService.getSharedMedia(req.auth!.userId, req.params.id as string));
  })
);

chatRouter.get(
  '/conversations/:id/documents',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await chatService.getSharedDocuments(req.auth!.userId, req.params.id as string));
  })
);

chatRouter.get(
  '/messages/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = (req.query.q as string) || '';
    const conversationId = req.query.conversationId as string | undefined;
    ok(res, await chatService.searchMessages(req.auth!.userId, query, conversationId));
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

chatRouter.post(
  '/messages/:id/star',
  requireAuth,
  requirePermission('chat.star'),
  asyncHandler(async (req, res) => {
    const star = req.body.star !== false;
    await chatService.starMessage(req.auth!.userId, req.params.id as string, star);
    ok(res, { starred: star });
  })
);

chatRouter.get(
  '/messages/starred',
  requireAuth,
  requirePermission('chat.star'),
  asyncHandler(async (req, res) => {
    ok(res, await chatService.getStarredMessages(req.auth!.userId));
  })
);

chatRouter.get(
  '/messages/scheduled',
  requireAuth,
  requirePermission('chat.schedule'),
  asyncHandler(async (req, res) => {
    ok(res, await chatService.getScheduledMessages(req.auth!.userId));
  })
);

chatRouter.delete(
  '/messages/scheduled/:id',
  requireAuth,
  requirePermission('chat.schedule'),
  asyncHandler(async (req, res) => {
    ok(res, await chatService.cancelScheduledMessage(req.auth!.userId, req.params.id as string));
  })
);
