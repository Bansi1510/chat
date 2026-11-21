import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { setupSocketIO } from './sockets/socketHandler';
import { logger } from './utils/logger';
import { startDisappearingCleanupScheduler } from './jobs/cleanupDisappearing';
import { startScheduledDispatcher } from './jobs/dispatchScheduled';

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);
  
  // Attach Socket.IO
  setupSocketIO(server);

  // Start background automation jobs
  startDisappearingCleanupScheduler(10); // Checks every 10 min for 20-day expired messages & Cloudinary media
  startScheduledDispatcher(30);          // Checks every 30 sec for due scheduled messages

  server.listen(env.PORT, () => logger.info(`Server listening on port ${env.PORT}`));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
