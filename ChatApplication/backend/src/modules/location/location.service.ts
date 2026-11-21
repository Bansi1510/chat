import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export async function startLiveLocation(
  userId: string,
  conversationId: string,
  durationSeconds: number,
  latitude: number,
  longitude: number
) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!isParticipant) throw AppError.notFound('Conversation not found');

  // Deactivate prior active sessions in this chat
  await prisma.liveLocationSession.updateMany({
    where: { conversationId, userId, isActive: true },
    data: { isActive: false },
  });

  const expiresAt = new Date(Date.now() + durationSeconds * 1000);
  const session = await prisma.liveLocationSession.create({
    data: {
      conversationId,
      userId,
      durationSeconds,
      latitude,
      longitude,
      expiresAt,
      isActive: true,
    },
  });

  return session;
}

export async function updateLocation(
  userId: string,
  sessionId: string,
  latitude: number,
  longitude: number
) {
  const session = await prisma.liveLocationSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId || !session.isActive || session.expiresAt < new Date()) {
    throw AppError.badRequest('Location session expired or inactive', 'SESSION_INACTIVE');
  }

  return prisma.liveLocationSession.update({
    where: { id: sessionId },
    data: { latitude, longitude },
  });
}

export async function stopLocation(userId: string, sessionId: string) {
  return prisma.liveLocationSession.updateMany({
    where: { id: sessionId, userId, isActive: true },
    data: { isActive: false },
  });
}

export async function getActiveLocations(conversationId: string) {
  return prisma.liveLocationSession.findMany({
    where: {
      conversationId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });
}
