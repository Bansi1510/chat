import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandling';
import { globalLimiter } from './middleware/rateLimit';
import { adminRouter } from './modules/admin/admin.routes';
import { credentialsRouter } from './modules/admin/credentials.routes';
import { authRouter } from './modules/auth/auth.routes';
import { qrRouter } from './modules/qr/qr.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { callRouter } from './modules/call/call.routes';
import { mediaRouter } from './modules/media/media.routes';
import { backupRouter } from './modules/backup/backup.routes';
import { locationRouter } from './modules/location/location.routes';
import { userRouter } from './modules/user/user.routes';

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
  app.use('/api/v1', credentialsRouter);
  app.use('/api/v1', qrRouter);
  app.use('/api/v1', chatRouter);
  app.use('/api/v1', callRouter);
  app.use('/api/v1', mediaRouter);
  app.use('/api/v1', backupRouter);
  app.use('/api/v1', locationRouter);
  app.use('/api/v1', userRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
