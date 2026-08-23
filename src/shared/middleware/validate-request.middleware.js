import { createError } from './error-handler.middleware.js';

const validateRequest = (schema, property = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(', ');
    return next(createError(message, 400));
  }

  Object.defineProperty(req, property, {
    value: result.data,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return next();
};

export { validateRequest };
