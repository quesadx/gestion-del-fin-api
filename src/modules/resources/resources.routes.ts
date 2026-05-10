import { Router } from 'express';
import { z } from 'zod';
import * as resourcesController from './resources.controller.js';
import { createResourceSchema, updateResourceSchema } from './resources.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/resources:
 *   post:
 *     tags: [Resources]
 *     summary: Create a resource type
 *     description: Creates a resource definition. Requires role resource_manager.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit, daily_ration, minimum_stock]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *               unit:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20
 *               daily_ration:
 *                 type: number
 *                 minimum: 0
 *               minimum_stock:
 *                 type: number
 *                 minimum: 0
 *               auto_daily:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Resource created successfully.
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
  roleMiddleware(['resource_manager']),
  validate(z.object({ body: createResourceSchema })),
  resourcesController.createResourceHandler,
);

/**
 * @openapi
 * /api/resources:
 *   get:
 *     tags: [Resources]
 *     summary: List resources
 *     description: Returns resources with optional pagination.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 20
 *     responses:
 *       200:
 *         description: Resources retrieved successfully.
 *       400:
 *         description: Invalid query parameters.
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
  '/',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ query: paginationQuerySchema })),
  resourcesController.listResourcesHandler,
);

/**
 * @openapi
 * /api/resources/{id}:
 *   get:
 *     tags: [Resources]
 *     summary: Get resource by id
 *     description: Returns one resource by numeric id.
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
 *         description: Resource retrieved successfully.
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
 *         description: Resource not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: idParamsSchema })),
  resourcesController.getResourceHandler,
);

/**
 * @openapi
 * /api/resources/{id}:
 *   put:
 *     tags: [Resources]
 *     summary: Update resource
 *     description: Updates a resource by id. Requires role resource_manager.
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *               unit:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20
 *               daily_ration:
 *                 type: number
 *                 minimum: 0
 *               minimum_stock:
 *                 type: number
 *                 minimum: 0
 *               auto_daily:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Resource updated successfully.
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
 *         description: Resource not found.
 *       500:
 *         description: Unexpected server error.
 */
router.put(
  '/:id',
  roleMiddleware(['resource_manager']),
  validate(z.object({ params: idParamsSchema, body: updateResourceSchema })),
  resourcesController.updateResourceHandler,
);

/**
 * @openapi
 * /api/resources/{id}:
 *   delete:
 *     tags: [Resources]
 *     summary: Delete resource
 *     description: Deletes a resource by id. Requires role resource_manager.
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
 *       204:
 *         description: Resource deleted successfully.
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
 *         description: Resource not found.
 *       500:
 *         description: Unexpected server error.
 */
router.delete(
  '/:id',
  roleMiddleware(['resource_manager']),
  validate(z.object({ params: idParamsSchema })),
  resourcesController.deleteResourceHandler,
);

export default router;
