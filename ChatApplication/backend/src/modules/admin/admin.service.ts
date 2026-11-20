import { Session } from '../../models/Session';
import { User } from '../../models/User';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../utils/AppError';
import { recordAudit } from './audit.service';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listUsers(page: number, limit: number, q?: string) {
  const filter: Record<string, unknown> = { status: 'active' };
  if (q) filter.usernameKey = { $regex: `^${escapeRegex(q.toLowerCase())}` };
  const [items, total] = await Promise.all([
    User.find(filter)
      .select('username role avatarUrl createdAt lastSeenAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function deleteUser(actorId: string, userId: string) {
  const user = await User.findById(userId);
  if (!user || user.status === 'deleted') throw AppError.notFound('User not found');
  if (user.role === 'superadmin') throw AppError.forbidden('Super Admin cannot be deleted', 'CANNOT_DELETE_ADMIN');
  const previousName = user.username;
  user.status = 'deleted';
  user.deletedAt = new Date();
  // Frees the username so the person can register a new account (no password recovery).
  user.usernameKey = `deleted:${user._id}`;
  await user.save();
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await recordAudit(actorId, 'user.delete', { type: 'user', id: userId }, { username: previousName });
}

export async function listAudit(page: number, limit: number, action?: string) {
  const filter = action ? { action } : {};
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}
