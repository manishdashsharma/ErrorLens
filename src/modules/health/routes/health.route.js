import express from 'express';
import { getLiveness, getReadiness } from '../controllers/health.controller.js';

const router = express.Router();

router.get('/', getLiveness);
router.get('/ready', getReadiness);

export default router;
