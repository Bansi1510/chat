import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandling';
import { globalLimiter } from './middleware/rateLimit';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { qrRouter } from './modules/qr/qr.routes';
import { chatRouter } from './modules/chat/chat.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(globalLimiter);

  app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use('/api/v1', authRouter);
  app.use('/api/v1', adminRouter);
  app.use('/api/v1', qrRouter);
  app.use('/api/v1', chatRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
