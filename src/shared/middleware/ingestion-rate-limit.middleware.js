import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import config from '../../config/index.js';
import { httpError } from '../utils/response.js';

const ingestionRateLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.ingestionMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.project?.id || ipKeyGenerator(req.ip),
  handler: (req, res) => {
    return httpError(req, res, new Error('Too many requests for this project'), 429);
  },
});

export { ingestionRateLimiter };
