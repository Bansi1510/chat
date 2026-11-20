import { Types } from 'mongoose';
import { AuditLog } from '../../models/AuditLog';

export const recordAudit = (
  actorId: string | Types.ObjectId,
  action: string,
  target?: { type: string; id: string },
  meta?: Record<string, unknown>,
) => AuditLog.create({ actorId, action, targetType: target?.type, targetId: target?.id, meta });
