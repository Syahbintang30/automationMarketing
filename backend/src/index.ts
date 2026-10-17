import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/prisma';

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      dryRun: env.DRY_RUN,
      baseUrl: env.APP_BASE_URL,
    },
    '🚀 Wardell Lead Engine Backend API is listening'
  );
});

// Graceful shutdown handling
const handleGracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database disconnect');
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown timeout reached (10s)');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
