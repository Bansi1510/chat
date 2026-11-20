import rateLimit from 'express-rate-limit';

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit: process.env.NODE_ENV === 'test' ? 10_000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message } },
  });

export const globalLimiter = make(60_000, 300, 'Too many requests, slow down');
export const authLimiter = make(15 * 60_000, 30, 'Too many authentication attempts, try later');
