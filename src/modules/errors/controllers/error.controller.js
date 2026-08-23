import {
  httpResponse,
  httpError,
  responseMessage,
  asyncHandler,
  logger,
} from '../../../shared/index.js';
import {
  ingestErrorService,
  getErrorsService,
  getErrorByIdService,
  resolveErrorService,
  ignoreErrorService,
} from '../services/error.service.js';

const ingestError = asyncHandler(async (req, res) => {
  try {
    const result = await ingestErrorService(req.project, req.body);
    return httpResponse(req, res, 202, responseMessage.custom('Error accepted'), result);
  } catch (error) {
    logger.error('Failed to ingest error', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const getErrors = asyncHandler(async (req, res) => {
  try {
    const result = await getErrorsService(req.query);
    return httpResponse(req, res, 200, responseMessage.SUCCESS.FETCHED, result);
  } catch (error) {
    logger.error('Failed to fetch errors', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const getErrorById = asyncHandler(async (req, res) => {
  try {
    const result = await getErrorByIdService(req.params.errorId);
    return httpResponse(req, res, 200, responseMessage.SUCCESS.FETCHED, result);
  } catch (error) {
    logger.error('Failed to fetch error', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const resolveError = asyncHandler(async (req, res) => {
  try {
    const result = await resolveErrorService(req.params.errorId);
    logger.info('Error resolved', { errorId: req.params.errorId, requestId: req.requestId });
    return httpResponse(req, res, 200, responseMessage.custom('Error resolved successfully'), result);
  } catch (error) {
    logger.error('Failed to resolve error', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const ignoreError = asyncHandler(async (req, res) => {
  try {
    const result = await ignoreErrorService(req.params.errorId);
    logger.info('Error ignored', { errorId: req.params.errorId, requestId: req.requestId });
    return httpResponse(req, res, 200, responseMessage.custom('Error ignored successfully'), result);
  } catch (error) {
    logger.error('Failed to ignore error', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

export { ingestError, getErrors, getErrorById, resolveError, ignoreError };
