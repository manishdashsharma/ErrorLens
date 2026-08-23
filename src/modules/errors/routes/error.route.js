import express from 'express';
import {
  ingestError,
  getErrors,
  getErrorById,
  resolveError,
  ignoreError,
} from '../controllers/error.controller.js';
import {
  authenticateAdmin,
  authenticateApiKey,
  validateRequest,
  ingestionRateLimiter,
} from '../../../shared/index.js';
import { ingestErrorSchema, listErrorsSchema } from '../validations/error.schema.js';

const router = express.Router();

router.post(
  '/ingest',
  authenticateApiKey,
  ingestionRateLimiter,
  validateRequest(ingestErrorSchema, 'body'),
  ingestError
);

router.get('/', authenticateAdmin, validateRequest(listErrorsSchema, 'query'), getErrors);
router.get('/:errorId', authenticateAdmin, getErrorById);
router.post('/:errorId/resolve', authenticateAdmin, resolveError);
router.post('/:errorId/ignore', authenticateAdmin, ignoreError);

export default router;
