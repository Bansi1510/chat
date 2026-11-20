import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessClaims {
  sub: string;
  sid: string;
  role: string;
}

export const signAccessToken = (claims: AccessClaims) =>
  jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m` });

export const verifyAccessToken = (token: string): AccessClaims =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;

export const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
