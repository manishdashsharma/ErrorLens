import { httpResponse, httpError, responseMessage, asyncHandler, logger } from '../../../shared/index.js';
import { checkDatabaseHealth } from '../../../config/databases.js';
import { checkRedisHealth } from '../../../config/redis.js';

const getLiveness = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.SUCCESS.ALIVE, {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const getReadiness = asyncHandler(async (req, res) => {
  const [postgresql, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
  const errors = [...postgresql.errors, ...redis.errors];
  const isReady = errors.length === 0;

  if (!isReady) {
    logger.error('Readiness check failed', { errors, requestId: req.requestId });
    return httpError(req, res, new Error(responseMessage.ERROR.SERVICE_UNAVAILABLE), 503);
  }

  return httpResponse(req, res, 200, responseMessage.DATABASE.DETAILED_HEALTH_CHECK, {
    postgresql,
    redis,
  });
});

export { getLiveness, getReadiness };
