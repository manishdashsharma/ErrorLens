import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  createApiKey,
  revokeApiKey,
} from '../controllers/project.controller.js';
import { authenticateAdmin, validateRequest } from '../../../shared/index.js';
import {
  createProjectSchema,
  listProjectsSchema,
  createApiKeySchema,
} from '../validations/project.schema.js';

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', validateRequest(listProjectsSchema, 'query'), getProjects);
router.post('/', validateRequest(createProjectSchema, 'body'), createProject);
router.get('/:projectId', getProjectById);
router.post('/:projectId/api-keys', validateRequest(createApiKeySchema, 'body'), createApiKey);
router.post('/:projectId/api-keys/:apiKeyId/revoke', revokeApiKey);

export default router;
