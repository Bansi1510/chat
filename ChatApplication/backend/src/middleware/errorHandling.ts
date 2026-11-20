import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')),
      );
    }
    // Express 5 exposes req.query as a read-only getter, so redefine the property instead of assigning.
    Object.defineProperty(req, source, { value: parsed.data, writable: true, configurable: true, enumerable: true });
    next();
  };

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) =>
  next(AppError.notFound('Route not found', 'ROUTE_NOT_FOUND'));

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
  }
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
