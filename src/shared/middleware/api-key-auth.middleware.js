import { createError, asyncHandler } from './error-handler.middleware.js';
import { hashApiKey } from '../utils/api-key.js';
import { getWriteDB } from '../../config/databases.js';

const authenticateApiKey = asyncHandler(async (req, res, next) => {
  const rawKey = req.get('x-api-key');

  if (!rawKey) {
    return next(createError('API key required', 401));
  }

  const db = getWriteDB();
  const apiKey = await db.apiKey.findFirst({
    where: { keyHash: hashApiKey(rawKey), isActive: true },
    select: { id: true, project: { select: { id: true, isActive: true } } },
  });

  if (!apiKey || !apiKey.project.isActive) {
    return next(createError('Invalid API key', 401));
  }

  req.project = apiKey.project;
  return next();
});

export { authenticateApiKey };
