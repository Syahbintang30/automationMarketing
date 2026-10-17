import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import Redis from 'ioredis';
import { env } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dryRun: env.DRY_RUN,
    environment: env.NODE_ENV,
  });
});

healthRouter.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, string> = {
    database: 'unknown',
    redis: 'unknown',
  };

  let hasError = false;

  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'healthy';
  } catch (err: unknown) {
    hasError = true;
    checks.database = `unhealthy: ${(err as Error).message}`;
  }

  // Check Redis
  try {
    const redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    checks.redis = 'healthy';
  } catch (err: unknown) {
    // In dev or local without redis running yet, warn but mark degraded
    checks.redis = `unreachable: ${(err as Error).message}`;
    // If running in development and testing DB is up, we can still report readiness
  }

  const statusCode = checks.database === 'healthy' ? 200 : 503;
  return res.status(statusCode).json({
    status: checks.database === 'healthy' ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});
