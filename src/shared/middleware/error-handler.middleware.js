import logger from '../utils/logger.js';
import { errorObject, responseMessage } from '../utils/response.js';

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || responseMessage.ERROR.SOMETHING_WENT_WRONG;

  logger.error(`Error ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (err.code === 'P2002') {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = responseMessage.ERROR.NOT_FOUND;
  } else if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = responseMessage.ERROR.FORBIDDEN;
  }

  const errorObj = errorObject(err, req, statusCode);
  errorObj.message = message;

  return res.status(statusCode).json(errorObj);
};

const notFoundHandler = (req, res, _next) => {
  const message = `Route ${req.originalUrl} not found`;
  logger.warn(`404 - ${message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
  });

  const errorObj = errorObject(new Error(message), req, 404);
  return res.status(404).json(errorObj);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const createError = (message, statusCode) => {
  return new AppError(message, statusCode);
};

export { errorHandler, notFoundHandler, asyncHandler, AppError, createError };
