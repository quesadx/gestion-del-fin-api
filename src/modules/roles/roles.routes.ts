import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { createRoleSchema, updateRoleSchema } from './roles.schema.js';
import * as rolesController from './roles.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

/**
 * @openapi
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create role
 *     description: Creates a role with optional permissions.
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.ROLES_CREATE),
  validate(z.object({ body: createRoleSchema })),
  rolesController.createRoleHandler,
);

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List roles
 *     description: Returns roles with assigned permissions.
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  permissionMiddleware(PERMISSIONS.ROLES_READ),
  validate(z.object({ query: paginationQuerySchema })),
  rolesController.getRolesHandler,
);

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by id
 *     description: Returns one role by numeric id.
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.ROLES_READ),
  validate(z.object({ params: idParamsSchema })),
  rolesController.getRoleHandler,
);

/**
 * @openapi
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Update role
 *     description: Updates role metadata and permissions.
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.ROLES_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateRoleSchema })),
  rolesController.updateRoleHandler,
);

/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete role
 *     description: Deletes a role by id.
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.ROLES_DELETE),
  validate(z.object({ params: idParamsSchema })),
  rolesController.deleteRoleHandler,
);

export default router;
