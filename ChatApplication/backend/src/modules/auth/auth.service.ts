import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../security/password';
import { generateRefreshToken, hashToken, signAccessToken } from '../../security/tokens';
import { AppError } from '../../utils/AppError';
import { getSettings } from '../admin/settings.service';

const cleanUsername = (username: string) => username.toLowerCase().trim();

export const publicUser = (u: { id: string; username: string; role: string; avatarUrl?: string | null }) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  avatarUrl: u.avatarUrl ?? null,
});

/**
 * Creates or updates a DeviceRegistration and initiates an AuthSession.
 * Enforces one Android device and one Web session per user.
 */
export async function startSession(
  user: { id: string; role: string },
  deviceName?: string,
  platform: 'android' | 'web' = 'android',
  identityKeys?: {
    deviceId?: string;
    registrationId?: number;
    identityKey?: string;
    signedPrekey?: string;
    signedPrekeySignature?: string;
  }
) {
  const deviceId = identityKeys?.deviceId || `dev_${platform}_${Date.now()}`;
  const registrationId = identityKeys?.registrationId || 1;
  const identityKey = identityKeys?.identityKey || 'placeholder_identity_key';
  const signedPrekey = identityKeys?.signedPrekey || 'placeholder_signed_prekey';
  const signedPrekeySignature = identityKeys?.signedPrekeySignature || 'placeholder_signature';

  // 1. Upsert DeviceRegistration for this (userId, platform)
  const deviceReg = await prisma.deviceRegistration.upsert({
    where: {
      userId_platform: {
        userId: user.id,
        platform,
      },
    },
    update: {
      deviceId,
      registrationId,
      identityKey,
      signedPrekey,
      signedPrekeySignature,
      lastActiveAt: new Date(),
      isActive: true,
    },
    create: {
      userId: user.id,
      platform,
      deviceId,
      registrationId,
      identityKey,
      signedPrekey,
      signedPrekeySignature,
      isActive: true,
    },
  });

  // 2. Revoke previous active sessions for this device registration
  await prisma.authSession.updateMany({
    where: {
      deviceRegistrationId: deviceReg.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  // 3. Create fresh AuthSession
  const refreshToken = generateRefreshToken();
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      deviceRegistrationId: deviceReg.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: deviceName || 'unknown',
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.role,
  });

  return { accessToken, refreshToken };
}

export async function register(
  username: string,
  password: string,
  deviceName?: string,
  platform: 'android' | 'web' = 'android',
  identityKeys?: any
) {
  const cleaned = cleanUsername(username);
  const existing = await prisma.user.findFirst({
    where: { usernameClean: cleaned },
  });
  if (existing) {
    throw AppError.conflict('Username is already taken', 'USERNAME_TAKEN');
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      usernameClean: cleaned,
      passwordHash: hashedPassword,
      role: 'user',
      status: 'active',
    },
  });

  const session = await startSession(user, deviceName, platform, identityKeys);
  return { user: publicUser(user), ...session };
}

export async function login(
  username: string,
  password: string,
  deviceName?: string,
  platform: 'android' | 'web' = 'android',
  identityKeys?: any
) {
  const invalid = AppError.unauthorized('Invalid username or password', 'INVALID_CREDENTIALS');
  const cleaned = cleanUsername(username);

  const user = await prisma.user.findFirst({
    where: { usernameClean: cleaned, status: 'active' },
  });

  if (!user) {
    await burnPasswordCheck(password);
    throw invalid;
  }

  const settings = await getSettings();
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw AppError.tooMany('Account temporarily locked due to failed logins', 'ACCOUNT_LOCKED');
  }

  const isValidPassword = await verifyPassword(user.passwordHash, password);
  if (!isValidPassword) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= (settings?.maxLoginAttempts ?? 5);
    await prisma.user.update({
      where: { id: user.id },
      data: lock
        ? {
            failedLoginCount: 0,
            lockUntil: new Date(Date.now() + (settings?.loginLockMinutes ?? 15) * 60_000),
          }
        : {
            failedLoginCount: failed,
          },
    });
    throw invalid;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockUntil: null },
  });

  const session = await startSession(user, deviceName, platform, identityKeys);
  return { user: publicUser(user), ...session };
}

export async function refresh(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const session = await prisma.authSession.findFirst({
    where: { refreshTokenHash: tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token is invalid', 'INVALID_REFRESH_TOKEN');
  }

  if (!session.user || session.user.status !== 'active') {
    throw AppError.unauthorized('Account is not active', 'ACCOUNT_INACTIVE');
  }

  const next = generateRefreshToken();
  await prisma.authSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(next) },
  });

  return {
    accessToken: signAccessToken({
      sub: session.user.id,
      sid: session.id,
      role: session.user.role,
    }),
    refreshToken: next,
  };
}

export async function logout(sessionId: string) {
  await prisma.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw AppError.notFound('User not found');
  return publicUser(user);
}

export async function changeUsername(userId: string, username: string) {
  const cleaned = cleanUsername(username);
  const existing = await prisma.user.findFirst({
    where: { usernameClean: cleaned, id: { not: userId } },
  });
  if (existing) {
    throw AppError.conflict('Username is already taken', 'USERNAME_TAKEN');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username, usernameClean: cleaned },
  });
  return publicUser(user);
}

export async function changePassword(userId: string, sessionId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(user.passwordHash, current))) {
    throw AppError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  const newHash = await hashPassword(next);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    }),
    prisma.authSession.updateMany({
      where: { userId, id: { not: sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
