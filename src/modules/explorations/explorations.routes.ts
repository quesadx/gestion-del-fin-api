import { Router } from 'express';
import { z } from 'zod';
import * as explorationsController from './explorations.controller.js';
import {
  createExplorationSchema,
  updateExplorationSchema,
  updateExplorationStatusSchema,
  deleteExplorationSchema,
} from './explorations.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

/**
 * @openapi
 * /api/expeditions:
 *   post:
 *     tags: [Explorations]
 *     summary: Create expedition
 *     description: Creates an expedition plan. Requires role travel_coordinator.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Expedition payload validated by createExplorationSchema.
 *     responses:
 *       201:
 *         description: Expedition created successfully.
 *       400:
 *         description: Validation failed.
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
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_CREATE),
  validate(z.object({ body: createExplorationSchema })),
  explorationsController.createExplorationHandler,
);

/**
 * @openapi
 * /api/expeditions:
 *   get:
 *     tags: [Explorations]
 *     summary: List expeditions
 *     description: Returns all expeditions visible to authorized roles.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expeditions retrieved successfully.
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  explorationsController.listExplorationsHandler,
);

/**
 * @openapi
 * /api/expeditions/{id}:
 *   get:
 *     tags: [Explorations]
 *     summary: Get expedition by id
 *     description: Returns one expedition by numeric id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Expedition retrieved successfully.
 *       400:
 *         description: Invalid path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Expedition not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_READ),
  validate(z.object({ params: idParamsSchema })),
  explorationsController.getExplorationHandler,
);

/**
 * @openapi
 * /api/expeditions/{id}:
 *   put:
 *     tags: [Explorations]
 *     summary: Update expedition
 *     description: Updates expedition details. Requires role travel_coordinator.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Expedition update payload validated by updateExplorationSchema.
 *     responses:
 *       200:
 *         description: Expedition updated successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Expedition not found.
 *       500:
 *         description: Unexpected server error.
 */
router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateExplorationSchema })),
  explorationsController.updateExplorationHandler,
);

/**
 * @openapi
 * /api/expeditions/{id}/status:
 *   patch:
 *     tags: [Explorations]
 *     summary: Update expedition status
 *     description: Updates only expedition lifecycle status. Requires role travel_coordinator.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Status payload validated by updateExplorationStatusSchema.
 *     responses:
 *       200:
 *         description: Expedition status updated successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Expedition not found.
 *       500:
 *         description: Unexpected server error.
 */
router.patch(
  '/:id/status',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_UPDATE_STATUS),
  validate(z.object({ params: idParamsSchema, body: updateExplorationStatusSchema })),
  explorationsController.updateExplorationStatusHandler,
);

/**
 * @openapi
 * /api/expeditions/{id}:
 *   delete:
 *     tags: [Explorations]
 *     summary: Delete expedition
 *     description: Deletes an expedition by id. Requires role travel_coordinator.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Deletion payload validated by deleteExplorationSchema.
 *     responses:
 *       204:
 *         description: Expedition deleted successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Expedition not found.
 *       500:
 *         description: Unexpected server error.
 */
router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_DELETE),
  validate(z.object({ params: idParamsSchema, body: deleteExplorationSchema })),
  explorationsController.deleteExplorationHandler,
);
export default router;
