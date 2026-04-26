import { Router } from 'express';
import { getServerTimeHandler } from './system.controller.js';

const router = Router();

/**
 * @openapi
 * /api/time:
 *  get:
 *    tags: [System]
 *    summary: Get current system time
 */
router.get('/time', getServerTimeHandler);

export default router;
