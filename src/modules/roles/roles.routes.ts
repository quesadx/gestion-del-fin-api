import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { createRoleSchema, updateRoleSchema } from './roles.schema.js';
import * as rolesController from './roles.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.ROLES_CREATE),
  validate(z.object({ body: createRoleSchema })),
  rolesController.createRoleHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.ROLES_READ),
  validate(z.object({ query: paginationQuerySchema })),
  rolesController.getRolesHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.ROLES_READ),
  validate(z.object({ params: idParamsSchema })),
  rolesController.getRoleHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.ROLES_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateRoleSchema })),
  rolesController.updateRoleHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.ROLES_DELETE),
  validate(z.object({ params: idParamsSchema })),
  rolesController.deleteRoleHandler,
);

export default router;
