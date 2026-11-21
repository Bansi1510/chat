import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { getIO } from '../sockets/socketHandler';

/**
 * Dispatches scheduled messages whose scheduledFor timestamp has arrived.
 */
export async function runScheduledDispatchBatch(batchSize = 50): Promise<number> {
  const now = new Date();

  const dueMessages = await prisma.message.findMany({
    where: {
      isScheduled: true,
      dispatchedAt: null,
      scheduledFor: { lte: now },
    },
    include: {
      conversation: {
        include: {
          disappearingSetting: true,
        },
      },
      sender: {
        select: { id: true, username: true, avatarUrl: true },
      },
      attachments: true,
    },
    take: batchSize,
    orderBy: { scheduledFor: 'asc' },
  });

  if (dueMessages.length === 0) return 0;

  logger.info({ count: dueMessages.length }, 'Dispatching scheduled messages');

  let dispatchedCount = 0;

  for (const msg of dueMessages) {
    try {
      let expiresAt: Date | null = null;
      let permanentDeleteAt: Date | null = null;
      const disappearing = msg.conversation.disappearingSetting;
      if (disappearing && disappearing.durationSeconds > 0) {
        expiresAt = new Date(now.getTime() + disappearing.durationSeconds * 1000);
        permanentDeleteAt = new Date(expiresAt.getTime() + 20 * 86_400_000);
      }

      const updated = await prisma.message.update({
        where: { id: msg.id },
        data: {
          isScheduled: false,
          dispatchedAt: now,
          expiresAt,
          permanentDeleteAt,
          cleanupStatus: permanentDeleteAt ? 'pending' : null,
        },
      });

      await prisma.conversation.update({
        where: { id: msg.conversationId },
        data: { lastMessageAt: now },
      });

      const io = getIO();
      if (io) {
        io.to(`conversation:${msg.conversationId}`).emit('message:new', {
          id: updated.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          clientMsgId: msg.clientMsgId,
          ciphertext: msg.ciphertext,
          messageType: msg.messageType,
          expiresAt: updated.expiresAt,
          createdAt: updated.createdAt,
          sender: msg.sender,
          attachments: msg.attachments,
          replyToId: msg.replyToId,
          isForwarded: msg.isForwarded,
        });
      }

      dispatchedCount++;
    } catch (err) {
      logger.error({ err, messageId: msg.id }, 'Failed to dispatch scheduled message');
    }
  }

  return dispatchedCount;
}

let scheduledIntervalHandle: NodeJS.Timeout | null = null;

export function startScheduledDispatcher(intervalSeconds = 30) {
  logger.info({ intervalSeconds }, 'Starting Scheduled Messages Dispatcher');

  runScheduledDispatchBatch().catch((err) =>
    logger.error({ err }, 'Initial scheduled messages dispatch run failed')
  );

  scheduledIntervalHandle = setInterval(() => {
    runScheduledDispatchBatch().catch((err) =>
      logger.error({ err }, 'Scheduled messages dispatch periodic run failed')
    );
  }, intervalSeconds * 1000);
}

export function stopScheduledDispatcher() {
  if (scheduledIntervalHandle) {
    clearInterval(scheduledIntervalHandle);
    scheduledIntervalHandle = null;
    logger.info('Stopped Scheduled Messages Dispatcher');
  }
}
