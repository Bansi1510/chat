import crypto from 'crypto';
import { Types } from 'mongoose';
import { QRToken } from '../../models/QRToken';
import { Connection } from '../../models/Connection';
import { Conversation } from '../../models/Conversation';
import { User } from '../../models/User';
import { AppError } from '../../utils/AppError';
import { getSettings } from '../admin/settings.service';

export const getPairKey = (id1: string | Types.ObjectId, id2: string | Types.ObjectId): string => {
  const [s1, s2] = [id1.toString(), id2.toString()].sort();
  return `${s1}_${s2}`;
};

export async function generateQRToken(userId: string) {
  const settings = await getSettings();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expirySeconds = settings?.qrExpirySeconds ?? 86400;

  // Invalidate previous active tokens for this user
  await QRToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });

  const record = await QRToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + expirySeconds * 1000),
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
  const qrRecord = await QRToken.findOne({
    userId: targetUserId,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!qrRecord) {
    throw AppError.badRequest('QR code is invalid or has expired', 'EXPIRED_OR_INVALID_QR');
  }

  const targetUser = await User.findOne({ _id: targetUserId, status: 'active' }).select('username avatarUrl').lean();
  if (!targetUser) {
    throw AppError.notFound('User no longer exists', 'USER_NOT_FOUND');
  }

  const pairKey = getPairKey(currentUserId, targetUserId);

  // Check or create Connection
  let connection = await Connection.findOne({ pairKey });
  if (!connection) {
    connection = await Connection.create({
      userA: new Types.ObjectId(currentUserId),
      userB: new Types.ObjectId(targetUserId),
      pairKey,
      status: 'active',
    });
  } else if (connection.status === 'blocked') {
    throw AppError.forbidden('Cannot connect with this user', 'CONNECTION_BLOCKED');
  }

  // Check or create Conversation
  let conversation = await Conversation.findOne({ pairKey });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [new Types.ObjectId(currentUserId), new Types.ObjectId(targetUserId)],
      pairKey,
    });
  }

  return {
    conversationId: conversation._id.toString(),
    connectionId: connection._id.toString(),
    user: {
      id: targetUser._id.toString(),
      username: targetUser.username,
      avatarUrl: targetUser.avatarUrl || null,
    },
  };
}

export async function getUserConnections(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const connections = await Connection.find({
    $or: [{ userA: userObjectId }, { userB: userObjectId }],
    status: 'active',
  })
    .populate('userA', 'username avatarUrl')
    .populate('userB', 'username avatarUrl')
    .lean();

  return connections.map((conn) => {
    const isUserA = conn.userA._id.toString() === userId;
    const peer = (isUserA ? conn.userB : conn.userA) as any;
    return {
      connectionId: conn._id.toString(),
      peerId: peer._id.toString(),
      username: peer.username,
      avatarUrl: peer.avatarUrl || null,
      pairKey: conn.pairKey,
    };
  });
}
