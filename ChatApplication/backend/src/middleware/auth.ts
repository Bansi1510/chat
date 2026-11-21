import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyAccessToken } from '../security/tokens';
import { AppError } from '../utils/AppError';
import { isAllowed } from '../modules/permissions/permission.service';
import { PermissionKey } from '../modules/permissions/permissionKeys';

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

/** Resolves a bearer token to an auth context; shared by HTTP and Socket.IO. */
export async function authenticateToken(token: string): Promise<AuthContext> {
  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired token', 'INVALID_TOKEN');
  }
  const session = await prisma.authSession.findUnique({
    where: { id: claims.sid },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw AppError.unauthorized('Session is no longer valid', 'SESSION_REVOKED');
  }
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.status !== 'active') {
    throw AppError.unauthorized('Account is not active', 'ACCOUNT_INACTIVE');
  }
  return { userId: user.id, sessionId: session.id, role: user.role };
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
    req.auth = await authenticateToken(header.slice(7));
    next();
  } catch (e) {
    next(e);
  }
};

export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) =>
  req.auth?.role === 'superadmin' ? next() : next(AppError.forbidden('Super Admin only', 'ADMIN_ONLY'));

/** Server-side RBAC gate. Hiding UI is never sufficient; every feature route uses this. */
export const requirePermission =
  (key: PermissionKey) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw AppError.unauthorized();
      if (!(await isAllowed(req.auth.userId, req.auth.role, key))) {
        throw AppError.forbidden(`Feature "${key}" is not enabled for your account`, 'PERMISSION_DENIED');
      }
      next();
    } catch (e) {
      next(e);
    }
  };
