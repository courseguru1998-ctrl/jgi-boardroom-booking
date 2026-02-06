import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { disconnectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { startEmailWorker, stopEmailWorker } from './jobs/email.worker.js';
import { startReminderWorker, stopReminderWorker } from './jobs/reminder.worker.js';

async function main(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Start background workers
  startEmailWorker();
  startReminderWorker();

  // Create and start Express app
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Server running on http://localhost:${config.port}`);
    logger.info(`Environment: ${config.env}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      await stopEmailWorker();
      await stopReminderWorker();
      await disconnectRedis();
      await disconnectDatabase();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
