import config from '../../config/index.js';
import { createError } from './error-handler.middleware.js';

const authenticateAdmin = (req, _res, next) => {
  const providedSecret = req.get('x-admin-secret');

  if (!providedSecret || providedSecret !== config.adminSecret) {
    return next(createError('Unauthorized access', 401));
  }

  return next();
};

export { authenticateAdmin };
