import express from 'express';
import { healthRoutes } from '../modules/health/index.js';
import { projectRoutes } from '../modules/project/index.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/projects', projectRoutes);

export default router;
