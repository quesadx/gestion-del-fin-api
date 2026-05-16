import { Router } from 'express';
import {
  getDashboardHandler,
  getResourcesHandler,
  getPeopleHandler,
  getExpeditionsHandler,
} from './metrics.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

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
router.get('/dashboard', permissionMiddleware(PERMISSIONS.METRICS_DASHBOARD), getDashboardHandler);

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
router.get('/resources', permissionMiddleware(PERMISSIONS.METRICS_RESOURCES), getResourcesHandler);

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
router.get('/people', permissionMiddleware(PERMISSIONS.METRICS_PEOPLE), getPeopleHandler);

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
  permissionMiddleware(PERMISSIONS.METRICS_EXPEDITIONS),
  getExpeditionsHandler,
);

export default router;
