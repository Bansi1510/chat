import { prisma } from '../../config/prisma';
import { getSettings } from '../admin/settings.service';

export async function getCallHistory(userId: string, page = 1, limit = 50) {
  const [items, total] = await Promise.all([
    prisma.callHistory.findMany({
      where: {
        OR: [{ callerId: userId }, { calleeId: userId }],
      },
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        caller: { select: { id: true, username: true, avatarUrl: true } },
        callee: { select: { id: true, username: true, avatarUrl: true } },
      },
    }),
    prisma.callHistory.count({
      where: {
        OR: [{ callerId: userId }, { calleeId: userId }],
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function logCall(
  userId: string,
  data: {
    calleeId: string;
    callType: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected' | 'busy' | 'failed';
    durationSeconds?: number;
    startedAt?: Date;
    endedAt?: Date;
  }
) {
  return prisma.callHistory.create({
    data: {
      callerId: userId,
      calleeId: data.calleeId,
      callType: data.callType,
      status: data.status,
      durationSeconds: data.durationSeconds || 0,
      startedAt: data.startedAt || new Date(),
      endedAt: data.endedAt || null,
    },
  });
}

export async function getTurnCredentials() {
  const settings = await getSettings();
  const turn = (settings as any)['integrations.turn'];
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      ...(turn ? [turn] : []),
    ],
  };
}
