import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDatabase();
  const server = http.createServer(createApp());
  server.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
