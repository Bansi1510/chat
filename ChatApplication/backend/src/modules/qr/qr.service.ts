import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { getSettings } from '../admin/settings.service';

export const getPairKey = (id1: string, id2: string): string => {
  const [s1, s2] = [id1, id2].sort();
  return `${s1}_${s2}`;
};

export async function generateQRToken(userId: string) {
  const settings = await getSettings();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expirySeconds = settings?.qrExpirySeconds ?? 86400;

  // Invalidate previous active tokens for this user
  await prisma.qrToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const record = await prisma.qrToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
    },
  });

  return {
    rawToken: `${userId}:${rawToken}`,
    expiresAt: record.expiresAt,
  };
}

export async function scanQRToken(currentUserId: string, fullToken: string) {
  const parts = fullToken.split(':');
  if (parts.length !== 2) {
    throw AppError.badRequest('Invalid QR code format', 'INVALID_QR');
  }
  const [targetUserId, rawToken] = parts;

  if (targetUserId === currentUserId) {
    throw AppError.badRequest('Cannot connect with yourself', 'CANNOT_CONNECT_SELF');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const qrRecord = await prisma.qrToken.findFirst({
    where: {
      userId: targetUserId,
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!qrRecord) {
    throw AppError.badRequest('QR code is invalid or has expired', 'EXPIRED_OR_INVALID_QR');
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, status: 'active' },
    select: { id: true, username: true, avatarUrl: true },
  });
  if (!targetUser) {
    throw AppError.notFound('User no longer exists', 'USER_NOT_FOUND');
  }

  // Check if target user has blocked current user
  const isBlocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: targetUserId, blockedId: currentUserId },
        { blockerId: currentUserId, blockedId: targetUserId },
      ],
    },
  });
  if (isBlocked) {
    throw AppError.forbidden('Cannot connect with this user', 'CONNECTION_BLOCKED');
  }

  const pairKey = getPairKey(currentUserId, targetUserId);

  // Check or create Conversation & Participants atomically
  let conversation = await prisma.conversation.findUnique({
    where: { pairKey },
    include: { participants: true },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        pairKey,
        participants: {
          create: [{ userId: currentUserId }, { userId: targetUserId }],
        },
      },
      include: { participants: true },
    });
  }

  return {
    conversationId: conversation.id,
    connectionId: conversation.id,
    user: {
      id: targetUser.id,
      username: targetUser.username,
      avatarUrl: targetUser.avatarUrl || null,
    },
  };
}

export async function getUserConnections(userId: string) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
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
  });

  return participants.map((p) => {
    const peer = p.conversation.participants[0]?.user;
    return {
      connectionId: p.conversation.id,
      peerId: peer?.id || '',
      username: peer?.username || '',
      avatarUrl: peer?.avatarUrl || null,
      pairKey: p.conversation.pairKey,
    };
  });
}
