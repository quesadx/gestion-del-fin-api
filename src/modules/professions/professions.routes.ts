import { Router } from 'express';
import { z } from 'zod';
import * as professionsController from './professions.controller.js';
import { createProfessionSchema, updateProfessionSchema } from './professions.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

/**
 * @openapi
 * /api/professions:
 *   post:
 *     tags: [Professions]
 *     summary: Create profession
 *     description: Creates a profession record. Requires role system_admin.
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
 *                 maxLength: 80
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Profession created successfully.
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
  permissionMiddleware(PERMISSIONS.PROFESSIONS_CREATE),
  validate(z.object({ body: createProfessionSchema })),
  professionsController.createProfessionHandler,
);

/**
 * @openapi
 * /api/professions:
 *   get:
 *     tags: [Professions]
 *     summary: List professions
 *     description: Returns all profession records available to authorized roles.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Professions retrieved successfully.
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  professionsController.listProfessionsHandler,
);

/**
 * @openapi
 * /api/professions/{id}:
 *   get:
 *     tags: [Professions]
 *     summary: Get profession by id
 *     description: Returns one profession by numeric id.
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
 *         description: Profession retrieved successfully.
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
 *         description: Profession not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_READ),
  validate(z.object({ params: idParamsSchema })),
  professionsController.getProfessionHandler,
);

/**
 * @openapi
 * /api/professions/{id}:
 *   put:
 *     tags: [Professions]
 *     summary: Update profession
 *     description: Updates one profession by id. Requires role system_admin.
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profession updated successfully.
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
 *         description: Profession not found.
 *       500:
 *         description: Unexpected server error.
 */
router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateProfessionSchema })),
  professionsController.updateProfessionHandler,
);

/**
 * @openapi
 * /api/professions/{id}:
 *   delete:
 *     tags: [Professions]
 *     summary: Delete profession
 *     description: Deletes one profession by id. Requires role system_admin.
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
 *         description: Profession deleted successfully.
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
 *         description: Profession not found.
 *       500:
 *         description: Unexpected server error.
 */
router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  professionsController.deleteProfessionHandler,
);

export default router;
