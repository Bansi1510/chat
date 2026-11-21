import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from '../modules/media/media.service';
import { recordAudit } from '../modules/admin/audit.service';

/**
 * Executes a single batch of permanent deletions for expired disappearing messages
 * whose 20-day retention window has elapsed (permanent_delete_at <= NOW()).
 */
export async function runDisappearingCleanupBatch(batchSize = 50): Promise<{
  processed: number;
  deleted: number;
  failed: number;
}> {
  const now = new Date();

  // Find messages eligible for permanent deletion
  const eligibleMessages = await prisma.message.findMany({
    where: {
      permanentDeleteAt: { lte: now },
      cleanupStatus: { not: 'completed' },
      cleanupAttempts: { lt: 5 }, // Retry up to 5 times if Cloudinary/Network fails
    },
    include: {
      attachments: true,
    },
    take: batchSize,
  });

  if (eligibleMessages.length === 0) {
    return { processed: 0, deleted: 0, failed: 0 };
  }

  logger.info(
    { count: eligibleMessages.length },
    'Processing permanent cleanup batch for expired disappearing messages'
  );

  let deletedCount = 0;
  let failedCount = 0;

  for (const message of eligibleMessages) {
    try {
      // 1. Mark as processing to prevent duplicate cleanup runs
      await prisma.message.update({
        where: { id: message.id },
        data: { cleanupStatus: 'processing' },
      });

      let allMediaDeleted = true;

      // 2. Permanently delete associated media files from Cloudinary
      for (const att of message.attachments) {
        const publicId = att.publicId || extractPublicIdFromUrl(att.fileUrl);
        if (publicId) {
          const resourceType = att.fileType.startsWith('video/')
            ? 'video'
            : att.fileType.startsWith('image/')
            ? 'image'
            : 'raw';

          const success = await deleteCloudinaryMedia(publicId, resourceType);
          if (!success) {
            allMediaDeleted = false;
            logger.warn(
              { messageId: message.id, publicId },
              'Cloudinary asset deletion failed during disappearing cleanup'
            );
          }
        }
      }

      // 3. If any Cloudinary deletion failed, increment attempts and retry next cycle
      if (!allMediaDeleted) {
        await prisma.message.update({
          where: { id: message.id },
          data: {
            cleanupStatus: 'failed',
            cleanupAttempts: { increment: 1 },
          },
        });
        failedCount++;
        continue;
      }

      // 4. Permanently delete message and its database relations
      await prisma.message.delete({
        where: { id: message.id },
      });

      deletedCount++;

      // 5. Audit log recording permanent erasure
      await recordAudit(
        null,
        'message.permanent_delete',
        { type: 'message', id: message.id },
        {
          conversationId: message.conversationId,
          attachmentsCount: message.attachments.length,
          retentionPeriodDays: 20,
        }
      );

      logger.info(
        { messageId: message.id, conversationId: message.conversationId },
        'Message and associated media permanently deleted after 20 days retention'
      );
    } catch (err) {
      logger.error({ err, messageId: message.id }, 'Error during message permanent cleanup');
      await prisma.message.update({
        where: { id: message.id },
        data: {
          cleanupStatus: 'failed',
          cleanupAttempts: { increment: 1 },
        },
      });
      failedCount++;
    }
  }

  return {
    processed: eligibleMessages.length,
    deleted: deletedCount,
    failed: failedCount,
  };
}

let cleanupIntervalHandle: NodeJS.Timeout | null = null;

/**
 * Starts the automatic background cleanup scheduler.
 * Runs on server start, then periodically (default: every 10 minutes).
 */
export function startDisappearingCleanupScheduler(intervalMinutes = 10) {
  logger.info(
    { intervalMinutes },
    'Starting Disappearing Messages 20-Day Permanent Deletion Scheduler'
  );

  // Run initial pass on startup
  runDisappearingCleanupBatch().catch((err) =>
    logger.error({ err }, 'Initial disappearing cleanup pass failed')
  );

  // Recurring periodic pass
  cleanupIntervalHandle = setInterval(() => {
    runDisappearingCleanupBatch().catch((err) =>
      logger.error({ err }, 'Scheduled disappearing cleanup pass failed')
    );
  }, intervalMinutes * 60 * 1000);
}

export function stopDisappearingCleanupScheduler() {
  if (cleanupIntervalHandle) {
    clearInterval(cleanupIntervalHandle);
    cleanupIntervalHandle = null;
    logger.info('Stopped Disappearing Messages Cleanup Scheduler');
  }
}
