import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { createPermissionSchema, updatePermissionSchema } from './permissions.schema.js';
import * as permissionsController from './permissions.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_CREATE),
  validate(z.object({ body: createPermissionSchema })),
  permissionsController.createPermissionHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  permissionsController.getPermissionsHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_READ),
  validate(z.object({ params: idParamsSchema })),
  permissionsController.getPermissionHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updatePermissionSchema })),
  permissionsController.updatePermissionHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  permissionsController.deletePermissionHandler,
);

export default router;
