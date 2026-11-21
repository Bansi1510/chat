import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export async function getConversations(userId: string) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          disappearingSetting: true,
          participants: {
            where: { userId: { not: userId } },
            include: {
              user: {
                select: { id: true, username: true, avatarUrl: true, lastSeenAt: true },
              },
            },
          },
        },
      },
    },
    orderBy: {
      conversation: {
        lastMessageAt: 'desc',
      },
    },
  });

  const results = await Promise.all(
    participants.map(async (p) => {
      const convo = p.conversation;
      const peer = convo.participants[0]?.user;

      // Find last visible message
      const lastMsg = await prisma.message.findFirst({
        where: {
          conversationId: convo.id,
          deletions: { none: { userId } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          isScheduled: false,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          receipts: true,
        },
      });

      // Count unread messages
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: convo.id,
          senderId: { not: userId },
          deletions: { none: { userId } },
          receipts: { none: { userId, readAt: { not: null } } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          isScheduled: false,
        },
      });

      const peerId = peer?.id;
      const peerReceipt = lastMsg?.receipts.find((r) => r.userId === peerId);

      return {
        id: convo.id,
        peer: peer
          ? {
              id: peer.id,
              username: peer.username,
              avatarUrl: peer.avatarUrl || null,
              lastSeenAt: peer.lastSeenAt || null,
            }
          : null,
        disappearingSeconds: convo.disappearingSetting?.durationSeconds || 0,
        pinned: p.isPinned,
        muted: p.isMuted,
        wallpaperUrl: p.wallpaperUrl || null,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              senderId: lastMsg.senderId,
              ciphertext: lastMsg.deletedForEveryone ? '' : lastMsg.ciphertext,
              type: lastMsg.messageType,
              createdAt: lastMsg.createdAt,
              delivered: !!peerReceipt?.deliveredAt,
              read: !!peerReceipt?.readAt,
            }
          : null,
        unreadCount,
      };
    })
  );

  return results;
}

export async function getMessages(
  userId: string,
  conversationId: string,
  before?: string,
  limit = 50
) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!isParticipant) throw AppError.notFound('Conversation not found');

  const where: any = {
    conversationId,
    deletions: { none: { userId } },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    isScheduled: false,
  };

  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      attachments: true,
      reactions: true,
      receipts: true,
      starred: { where: { userId } },
    },
  });

  return messages.reverse().map((m) => {
    const peerReceipt = m.receipts.find((r) => r.userId !== m.senderId);
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      clientMsgId: m.clientMsgId,
      ciphertext: m.deletedForEveryone ? '' : m.ciphertext,
      type: m.messageType,
      attachments: m.attachments,
      replyToId: m.replyToId,
      forwarded: m.isForwarded,
      edited: m.isEdited,
      reactions: m.reactions.map((r) => ({ userId: r.userId, emoji: r.emoji })),
      starred: m.starred.length > 0,
      delivered: !!peerReceipt?.deliveredAt,
      read: !!peerReceipt?.readAt,
      deletedForEveryone: m.deletedForEveryone,
      expiresAt: m.expiresAt,
      createdAt: m.createdAt,
    };
  });
}

export async function sendMessage(
  senderId: string,
  data: {
    conversationId: string;
    clientMsgId: string;
    ciphertext: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location';
    attachments?: Array<{
      fileUrl: string;
      fileType: string;
      fileSizeBytes: number;
      fileName: string;
      thumbnailUrl?: string;
      durationSeconds?: number;
    }>;
    replyToId?: string;
    forwarded?: boolean;
    isScheduled?: boolean;
    scheduledFor?: Date;
  }
) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: data.conversationId, userId: senderId } },
    include: {
      conversation: {
        include: { disappearingSetting: true },
      },
    },
  });
  if (!isParticipant) throw AppError.notFound('Conversation not found');

  // Disappearing message expiration
  let expiresAt: Date | null = null;
  let permanentDeleteAt: Date | null = null;
  const disappearing = isParticipant.conversation.disappearingSetting;
  if (disappearing && disappearing.durationSeconds > 0) {
    expiresAt = new Date(Date.now() + disappearing.durationSeconds * 1000);
    // 20-Day Retention Policy: permanent_delete_at = message_expired_at + 20 days
    permanentDeleteAt = new Date(expiresAt.getTime() + 20 * 86_400_000);
  }

  const msg = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      senderId,
      clientMsgId: data.clientMsgId,
      ciphertext: data.ciphertext,
      messageType: data.type || 'text',
      replyToId: data.replyToId || null,
      isForwarded: !!data.forwarded,
      expiresAt,
      permanentDeleteAt,
      cleanupStatus: permanentDeleteAt ? 'pending' : null,
      isScheduled: !!data.isScheduled,
      scheduledFor: data.scheduledFor || null,
      attachments: data.attachments?.length
        ? {
            create: data.attachments.map((att: any) => ({
              fileUrl: att.fileUrl,
              fileType: att.fileType,
              fileSizeBytes: BigInt(att.fileSizeBytes),
              fileName: att.fileName,
              thumbnailUrl: att.thumbnailUrl || null,
              durationSeconds: att.durationSeconds || null,
              publicId: att.publicId || null,
              resourceType: att.resourceType || 'auto',
            })),
          }
        : undefined,
    },
    include: { attachments: true },
  });

  if (!data.isScheduled) {
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: new Date() },
    });
  }

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    clientMsgId: msg.clientMsgId,
    ciphertext: msg.ciphertext,
    type: msg.messageType,
    attachments: msg.attachments,
    replyToId: msg.replyToId,
    forwarded: msg.isForwarded,
    expiresAt: msg.expiresAt,
    createdAt: msg.createdAt,
  };
}

export async function markAsDelivered(userId: string, messageIds: string[]) {
  if (!messageIds.length) return;
  const now = new Date();
  await Promise.all(
    messageIds.map((msgId) =>
      prisma.messageReceipt.upsert({
        where: { messageId_userId: { messageId: msgId, userId } },
        update: { deliveredAt: now },
        create: { messageId: msgId, userId, deliveredAt: now },
      })
    )
  );
}

export async function markAsRead(userId: string, messageIds: string[]) {
  if (!messageIds.length) return;
  const now = new Date();
  await Promise.all(
    messageIds.map((msgId) =>
      prisma.messageReceipt.upsert({
        where: { messageId_userId: { messageId: msgId, userId } },
        update: { deliveredAt: now, readAt: now },
        create: { messageId: msgId, userId, deliveredAt: now, readAt: now },
      })
    )
  );
}

export async function deleteMessage(userId: string, messageId: string, forEveryone: boolean) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw AppError.notFound('Message not found');

  if (forEveryone) {
    if (msg.senderId !== userId) {
      throw AppError.forbidden('Can only delete your own messages for everyone');
    }
    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedForEveryone: true,
        ciphertext: '',
      },
    });
    return { deletedForEveryone: true };
  } else {
    await prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { deletedAt: new Date() },
      create: { messageId, userId },
    });
    return { deletedForMe: true };
  }
}

export async function reactToMessage(userId: string, messageId: string, emoji: string) {
  if (!emoji) {
    await prisma.messageReaction.deleteMany({
      where: { messageId, userId },
    });
    return;
  }
  await prisma.messageReaction.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: { emoji },
    create: { messageId, userId, emoji },
  });
}

export async function starMessage(userId: string, messageId: string, star: boolean) {
  if (star) {
    await prisma.starredMessage.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: {},
      create: { messageId, userId },
    });
  } else {
    await prisma.starredMessage.deleteMany({
      where: { messageId, userId },
    });
  }
}

export async function getStarredMessages(userId: string) {
  const starred = await prisma.starredMessage.findMany({
    where: {
      userId,
      message: {
        deletions: { none: { userId } },
        deletedForEveryone: false,
        // Expired disappearing messages must not appear in starred messages
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    },
    include: {
      message: {
        include: {
          attachments: true,
          conversation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return starred.map((s) => ({
    id: s.message.id,
    conversationId: s.message.conversationId,
    senderId: s.message.senderId,
    ciphertext: s.message.ciphertext,
    type: s.message.messageType,
    attachments: s.message.attachments,
    createdAt: s.message.createdAt,
    starredAt: s.createdAt,
  }));
}

export async function getSharedMedia(userId: string, conversationId: string) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!isParticipant) throw AppError.notFound('Conversation not found');

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletions: { none: { userId } },
      deletedForEveryone: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      messageType: { in: ['image', 'video'] },
    },
    orderBy: { createdAt: 'desc' },
    include: { attachments: true },
  });

  return messages.flatMap((m) =>
    m.attachments.map((att) => ({
      messageId: m.id,
      fileUrl: att.fileUrl,
      fileType: att.fileType,
      fileName: att.fileName,
      fileSizeBytes: Number(att.fileSizeBytes),
      createdAt: m.createdAt,
    }))
  );
}

export async function getSharedDocuments(userId: string, conversationId: string) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!isParticipant) throw AppError.notFound('Conversation not found');

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletions: { none: { userId } },
      deletedForEveryone: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      messageType: 'document',
    },
    orderBy: { createdAt: 'desc' },
    include: { attachments: true },
  });

  return messages.flatMap((m) =>
    m.attachments.map((att) => ({
      messageId: m.id,
      fileUrl: att.fileUrl,
      fileType: att.fileType,
      fileName: att.fileName,
      fileSizeBytes: Number(att.fileSizeBytes),
      createdAt: m.createdAt,
    }))
  );
}

export async function searchMessages(userId: string, query: string, conversationId?: string) {
  const where: any = {
    deletions: { none: { userId } },
    deletedForEveryone: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ciphertext: { contains: query, mode: 'insensitive' },
    conversation: {
      participants: { some: { userId } },
    },
  };

  if (conversationId) {
    where.conversationId = conversationId;
  }

  const matches = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      conversation: {
        include: {
          participants: {
            where: { userId: { not: userId } },
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          },
        },
      },
    },
  });

  return matches.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    ciphertext: m.ciphertext,
    createdAt: m.createdAt,
    peer: m.conversation.participants[0]?.user,
  }));
}

export async function updateConversationSettings(
  userId: string,
  conversationId: string,
  patch: { disappearingSeconds?: number; pinned?: boolean; muted?: boolean; wallpaper?: string }
) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!isParticipant) throw AppError.notFound('Conversation not found');

  if (typeof patch.disappearingSeconds === 'number') {
    await prisma.disappearingSetting.upsert({
      where: { conversationId },
      update: {
        durationSeconds: patch.disappearingSeconds,
        updatedById: userId,
      },
      create: {
        conversationId,
        durationSeconds: patch.disappearingSeconds,
        updatedById: userId,
      },
    });
  }

  const participantUpdates: any = {};
  if (typeof patch.pinned === 'boolean') participantUpdates.isPinned = patch.pinned;
  if (typeof patch.muted === 'boolean') participantUpdates.isMuted = patch.muted;
  if (patch.wallpaper !== undefined) participantUpdates.wallpaperUrl = patch.wallpaper;

  if (Object.keys(participantUpdates).length > 0) {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: participantUpdates,
    });
  }
}

export async function getScheduledMessages(userId: string) {
  const messages = await prisma.message.findMany({
    where: {
      senderId: userId,
      isScheduled: true,
      dispatchedAt: null,
    },
    orderBy: { scheduledFor: 'asc' },
    include: { attachments: true },
  });

  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    clientMsgId: m.clientMsgId,
    ciphertext: m.ciphertext,
    type: m.messageType,
    scheduledFor: m.scheduledFor,
    attachments: m.attachments,
    createdAt: m.createdAt,
  }));
}

export async function cancelScheduledMessage(userId: string, messageId: string) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.senderId !== userId || !msg.isScheduled || msg.dispatchedAt) {
    throw AppError.notFound('Scheduled message not found or already dispatched');
  }

  await prisma.message.delete({ where: { id: messageId } });
  return { cancelled: true };
}
