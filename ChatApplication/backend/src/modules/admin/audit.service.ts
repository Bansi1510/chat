import { prisma } from '../../config/prisma';

export async function recordAudit(
  actorId: string | null | undefined,
  action: string,
  target?: { type: string; id?: string },
  metadata?: Record<string, unknown>,
) {
  return prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      targetType: target?.type || 'system',
      targetId: target?.id || null,
      metadata: (metadata || {}) as any,
    },
  });
}
