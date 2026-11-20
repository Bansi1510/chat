import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { setupSocketIO } from './sockets/socketHandler';
import { logger } from './utils/logger';

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);
  
  // Attach Socket.IO
  setupSocketIO(server);

  server.listen(env.PORT, () => logger.info(`Server listening on port ${env.PORT}`));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
