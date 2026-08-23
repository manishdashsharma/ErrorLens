import {
  httpResponse,
  httpError,
  responseMessage,
  asyncHandler,
  logger,
} from '../../../shared/index.js';
import {
  createProjectService,
  getProjectsService,
  getProjectByIdService,
  createApiKeyService,
  revokeApiKeyService,
} from '../services/project.service.js';

const createProject = asyncHandler(async (req, res) => {
  try {
    const result = await createProjectService(req.body);
    logger.info('Project created', {
      projectId: result.project.id,
      requestId: req.requestId,
    });
    return httpResponse(req, res, 201, responseMessage.SUCCESS.CREATED, result);
  } catch (error) {
    logger.error('Failed to create project', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const getProjects = asyncHandler(async (req, res) => {
  try {
    const result = await getProjectsService(req.query);
    return httpResponse(req, res, 200, responseMessage.SUCCESS.FETCHED, result);
  } catch (error) {
    logger.error('Failed to fetch projects', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const getProjectById = asyncHandler(async (req, res) => {
  try {
    const result = await getProjectByIdService(req.params.projectId);
    return httpResponse(req, res, 200, responseMessage.SUCCESS.FETCHED, result);
  } catch (error) {
    logger.error('Failed to fetch project', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const createApiKey = asyncHandler(async (req, res) => {
  try {
    const result = await createApiKeyService(req.params.projectId, req.body);
    logger.info('API key created', {
      projectId: req.params.projectId,
      requestId: req.requestId,
    });
    return httpResponse(req, res, 201, responseMessage.SUCCESS.CREATED, result);
  } catch (error) {
    logger.error('Failed to create API key', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

const revokeApiKey = asyncHandler(async (req, res) => {
  try {
    const result = await revokeApiKeyService(req.params.projectId, req.params.apiKeyId);
    logger.info('API key revoked', {
      projectId: req.params.projectId,
      apiKeyId: req.params.apiKeyId,
      requestId: req.requestId,
    });
    return httpResponse(req, res, 200, responseMessage.custom('API key revoked successfully'), result);
  } catch (error) {
    logger.error('Failed to revoke API key', {
      stack: error.stack,
      requestId: req.requestId,
      error: error.message,
    });
    return httpError(req, res, error, error.statusCode || 500);
  }
});

export { createProject, getProjects, getProjectById, createApiKey, revokeApiKey };
