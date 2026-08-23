import { httpResponse, httpError, responseMessage, asyncHandler, logger } from '../../../shared/index.js';
import { checkDatabaseHealth } from '../../../config/databases.js';
import { checkRedisHealth } from '../../../config/redis.js';
import { checkInngestHealth } from '../../../config/inngest.js';

const getLiveness = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.SUCCESS.ALIVE, {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const getReadiness = asyncHandler(async (req, res) => {
  const [postgresql, redis, inngestHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkInngestHealth(),
  ]);
  const errors = [...postgresql.errors, ...redis.errors, ...inngestHealth.errors];
  const isReady = errors.length === 0;

  if (!isReady) {
    logger.error('Readiness check failed', { errors, requestId: req.requestId });
    return httpError(req, res, new Error(responseMessage.ERROR.SERVICE_UNAVAILABLE), 503);
  }

  return httpResponse(req, res, 200, responseMessage.DATABASE.DETAILED_HEALTH_CHECK, {
    postgresql,
    redis,
    inngest: inngestHealth,
  });
});

export { getLiveness, getReadiness };
