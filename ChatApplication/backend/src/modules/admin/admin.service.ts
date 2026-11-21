import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAudit } from './audit.service';

export async function listUsers(page: number, limit: number, q?: string) {
  const where: any = { status: 'active' };
  if (q) {
    where.usernameClean = {
      startsWith: q.toLowerCase(),
    };
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function deleteUser(actorId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === 'deleted') throw AppError.notFound('User not found');
  if (user.role === 'superadmin') throw AppError.forbidden('Super Admin cannot be deleted', 'CANNOT_DELETE_ADMIN');

  const previousName = user.username;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        usernameClean: `deleted:${user.id}`,
      },
    }),
    prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordAudit(actorId, 'user.delete', { type: 'user', id: userId }, { username: previousName });
}

export async function listAudit(page: number, limit: number, action?: string) {
  const where: any = action ? { action } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, limit };
}
