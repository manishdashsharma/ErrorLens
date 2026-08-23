import express from 'express';
import { healthRoutes } from '../modules/health/index.js';
import { projectRoutes } from '../modules/project/index.js';
import { errorRoutes } from '../modules/errors/index.js';
import { metaRoutes } from '../modules/meta/index.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/projects', projectRoutes);
router.use('/errors', errorRoutes);
router.use('/meta', metaRoutes);

export default router;
