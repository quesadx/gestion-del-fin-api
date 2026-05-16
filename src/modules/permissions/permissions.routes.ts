import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { createPermissionSchema, updatePermissionSchema } from './permissions.schema.js';
import * as permissionsController from './permissions.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

/**
 * @openapi
 * /api/permissions:
 *   post:
 *     tags: [Permissions]
 *     summary: Create permission
 *     description: Creates a permission definition.
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_CREATE),
  validate(z.object({ body: createPermissionSchema })),
  permissionsController.createPermissionHandler,
);

/**
 * @openapi
 * /api/permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: List permissions
 *     description: Returns permission definitions.
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  permissionsController.getPermissionsHandler,
);

/**
 * @openapi
 * /api/permissions/{id}:
 *   get:
 *     tags: [Permissions]
 *     summary: Get permission by id
 *     description: Returns one permission by numeric id.
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_READ),
  validate(z.object({ params: idParamsSchema })),
  permissionsController.getPermissionHandler,
);

/**
 * @openapi
 * /api/permissions/{id}:
 *   put:
 *     tags: [Permissions]
 *     summary: Update permission
 *     description: Updates permission metadata.
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updatePermissionSchema })),
  permissionsController.updatePermissionHandler,
);

/**
 * @openapi
 * /api/permissions/{id}:
 *   delete:
 *     tags: [Permissions]
 *     summary: Delete permission
 *     description: Deletes a permission by id.
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  permissionsController.deletePermissionHandler,
);

export default router;
