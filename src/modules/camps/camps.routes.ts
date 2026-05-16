import { Router } from 'express';
import { z } from 'zod';
import * as campsController from './camps.controller.js';
import { createCampSchema, updateCampSchema } from './camps.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import peopleRoutes from '../people/people.routes.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

/**
 * @openapi
 * /api/camps:
 *   post:
 *     tags: [Camps]
 *     summary: Create a new camp
 *     description: Creates a camp. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, ABANDONED]
 *               ai_context_prompt:
 *                 type: string
 *     responses:
 *       201:
 *         description: Camp created successfully.
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
 *       409:
 *         description: Conflict with existing data.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.CAMPS_CREATE),
  validate(z.object({ body: createCampSchema })),
  campsController.createCampHandler,
);

/**
 * @openapi
 * /api/camps:
 *   get:
 *     tags: [Camps]
 *     summary: List camps
 *     description: Returns all camps visible to authorized roles.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Camps retrieved successfully.
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/',
  permissionMiddleware(PERMISSIONS.CAMPS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  campsController.getCampsHandler,
);

/**
 * @openapi
 * /api/camps/{id}:
 *   get:
 *     tags: [Camps]
 *     summary: Get camp by id
 *     description: Returns one camp by numeric id.
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
 *         description: Camp retrieved successfully.
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
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.CAMPS_READ),
  validate(z.object({ params: idParamsSchema })),
  campsController.getCampHandler,
);

/**
 * @openapi
 * /api/camps/{id}:
 *   put:
 *     tags: [Camps]
 *     summary: Update camp
 *     description: Updates one camp by id. Requires role system_admin.
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
 *                 maxLength: 100
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, ABANDONED]
 *               ai_context_prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Camp updated successfully.
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
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.CAMPS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateCampSchema })),
  campsController.updateCampHandler,
);

/**
 * @openapi
 * /api/camps/{id}:
 *   delete:
 *     tags: [Camps]
 *     summary: Delete camp
 *     description: Deletes one camp by id. Requires role system_admin.
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
 *         description: Camp deleted successfully.
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
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.CAMPS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  campsController.deleteCampHandler,
);

router.use('/:campId/people', peopleRoutes);

export default router;
