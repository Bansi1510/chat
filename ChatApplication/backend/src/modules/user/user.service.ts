import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw AppError.badRequest('Cannot block yourself', 'CANNOT_BLOCK_SELF');
  }

  const target = await prisma.user.findUnique({ where: { id: blockedId } });
  if (!target) throw AppError.notFound('User not found');

  return prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return prisma.blockedUser.deleteMany({
    where: { blockerId, blockedId },
  });
}

export async function getBlockedUsers(blockerId: string) {
  const blocks = await prisma.blockedUser.findMany({
    where: { blockerId },
    include: {
      blocked: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  return blocks.map((b) => ({
    id: b.blocked.id,
    username: b.blocked.username,
    avatarUrl: b.blocked.avatarUrl,
    blockedAt: b.createdAt,
  }));
}
