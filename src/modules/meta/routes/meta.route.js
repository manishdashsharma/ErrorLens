import express from 'express';
import { getMeta } from '../controllers/meta.controller.js';

const router = express.Router();

router.get('/', getMeta);

export default router;
