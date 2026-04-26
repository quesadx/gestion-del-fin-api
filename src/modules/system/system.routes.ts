import { Router } from 'express';
import { getServerTimeHandler } from './system.controller.js';

const router = Router();

/**
 * @openapi
 * /api/system/time:
 *   get:
 *     tags: [System]
 *     summary: Get server time snapshot
 *     description: Returns the current server time in multiple formats.
 *     responses:
 *       200:
 *         description: Current server time returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemTimeResponse'
 *       500:
 *         description: Unexpected server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/time', getServerTimeHandler);

export default router;
