import { Types } from 'mongoose';
import { Session } from '../../models/Session';
import { User } from '../../models/User';
import { env } from '../../config/env';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../security/password';
import { generateRefreshToken, hashToken, signAccessToken } from '../../security/tokens';
import { AppError } from '../../utils/AppError';
import { getSettings } from '../admin/settings.service';

const keyOf = (username: string) => username.toLowerCase();
const isDuplicateKey = (e: unknown) => (e as { code?: number }).code === 11000;

export const publicUser = (u: { _id: unknown; username: string; role: string; avatarUrl?: string | null }) => ({
  id: String(u._id),
  username: u.username,
  role: u.role,
  avatarUrl: u.avatarUrl ?? null,
});

/** Creates a session, revoking every other one (one device per account). */
async function startSession(user: { _id: Types.ObjectId; role: string }, deviceName?: string) {
  await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  const refreshToken = generateRefreshToken();
  const session = await Session.create({
    userId: user._id,
    refreshHash: hashToken(refreshToken),
    deviceName: deviceName ?? 'unknown',
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  const accessToken = signAccessToken({ sub: String(user._id), sid: String(session._id), role: user.role });
  return { accessToken, refreshToken };
}

export async function register(username: string, password: string, deviceName?: string) {
  try {
    const user = await User.create({
      username,
      usernameKey: keyOf(username),
      passwordHash: await hashPassword(password),
    });
    return { user: publicUser(user), ...(await startSession(user, deviceName)) };
  } catch (e) {
    if (isDuplicateKey(e)) throw AppError.conflict('Username is already taken', 'USERNAME_TAKEN');
    throw e;
  }
}

export async function login(username: string, password: string, deviceName?: string) {
  const invalid = AppError.unauthorized('Invalid username or password', 'INVALID_CREDENTIALS');
  const user = await User.findOne({ usernameKey: keyOf(username), status: 'active' });
  if (!user) {
    await burnPasswordCheck(password);
    throw invalid;
  }
  const settings = await getSettings();
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw AppError.tooMany('Account temporarily locked due to failed logins', 'ACCOUNT_LOCKED');
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= (settings?.maxLoginAttempts ?? 5);
    await User.updateOne(
      { _id: user._id },
      lock
        ? { $set: { failedLoginCount: 0, lockUntil: new Date(Date.now() + (settings?.loginLockMinutes ?? 15) * 60_000) } }
        : { $set: { failedLoginCount: failed } },
    );
    throw invalid;
  }
  await User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockUntil: null } });
  return { user: publicUser(user), ...(await startSession(user, deviceName)) };
}

export async function refresh(refreshToken: string) {
  const session = await Session.findOne({ refreshHash: hashToken(refreshToken) });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token is invalid', 'INVALID_REFRESH_TOKEN');
  }
  const user = await User.findOne({ _id: session.userId, status: 'active' });
  if (!user) throw AppError.unauthorized('Account is not active', 'ACCOUNT_INACTIVE');
  const next = generateRefreshToken();
  session.refreshHash = hashToken(next);
  await session.save();
  return {
    accessToken: signAccessToken({ sub: String(user._id), sid: String(session._id), role: user.role }),
    refreshToken: next,
  };
}

export const logout = (sessionId: string) =>
  Session.updateOne({ _id: sessionId, revokedAt: null }, { $set: { revokedAt: new Date() } });

export async function getProfile(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw AppError.notFound('User not found');
  return publicUser(user);
}

export async function changeUsername(userId: string, username: string) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { username, usernameKey: keyOf(username) } },
      { new: true },
    ).lean();
    if (!user) throw AppError.notFound('User not found');
    return publicUser(user);
  } catch (e) {
    if (isDuplicateKey(e)) throw AppError.conflict('Username is already taken', 'USERNAME_TAKEN');
    throw e;
  }
}

export async function changePassword(userId: string, sessionId: string, current: string, next: string) {
  const user = await User.findById(userId);
  if (!user || !(await verifyPassword(user.passwordHash, current))) {
    throw AppError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');
  }
  user.passwordHash = await hashPassword(next);
  await user.save();
  await Session.updateMany(
    { userId, _id: { $ne: sessionId }, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}
