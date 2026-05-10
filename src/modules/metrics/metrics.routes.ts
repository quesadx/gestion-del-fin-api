import { Router } from 'express';
import {
  getDashboardHandler,
  getResourcesHandler,
  getPeopleHandler,
  getExpeditionsHandler,
} from './metrics.controller.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/metrics/dashboard:
 *   get:
 *     tags: [Metrics]
 *     summary: Get metrics dashboard overview
 *     description: Returns aggregated metrics for the camp (survivors, resources, expeditions, alerts). Requires appropriate role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully.
 *       400:
 *         description: Invalid request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get('/dashboard', roleMiddleware(['system_admin', 'resource_manager']), getDashboardHandler);

/**
 * @openapi
 * /api/metrics/resources:
 *   get:
 *     tags: [Metrics]
 *     summary: List resource summaries for dashboard
 *     description: Returns aggregated resource summaries (quantity, thresholds, status) for the camp.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resource summaries retrieved successfully.
 *       400:
 *         description: Invalid request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get('/resources', roleMiddleware(['system_admin', 'resource_manager']), getResourcesHandler);

/**
 * @openapi
 * /api/metrics/people:
 *   get:
 *     tags: [Metrics]
 *     summary: People breakdown and statistics
 *     description: Returns counts by status and profession and other people-related metrics for the camp.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: People metrics retrieved successfully.
 *       400:
 *         description: Invalid request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get('/people', roleMiddleware(['system_admin', 'resource_manager']), getPeopleHandler);

/**
 * @openapi
 * /api/metrics/expeditions:
 *   get:
 *     tags: [Metrics]
 *     summary: Expedition statistics
 *     description: Returns active and recent expedition statistics including participants and resource consumption.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expedition metrics retrieved successfully.
 *       400:
 *         description: Invalid request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/expeditions',
  roleMiddleware(['system_admin', 'resource_manager']),
  getExpeditionsHandler,
);

export default router;
