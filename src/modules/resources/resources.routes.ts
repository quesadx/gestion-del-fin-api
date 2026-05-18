import { Router } from 'express';
import { z } from 'zod';
import * as resourcesController from './resources.controller.js';
import { createResourceSchema, updateResourceSchema } from './resources.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.RESOURCES_CREATE),
  validate(z.object({ body: createResourceSchema })),
  resourcesController.createResourceHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.RESOURCES_READ),
  validate(z.object({ query: paginationQuerySchema })),
  resourcesController.listResourcesHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.RESOURCES_READ),
  validate(z.object({ params: idParamsSchema })),
  resourcesController.getResourceHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.RESOURCES_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateResourceSchema })),
  resourcesController.updateResourceHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.RESOURCES_DELETE),
  validate(z.object({ params: idParamsSchema })),
  resourcesController.deleteResourceHandler,
);

export default router;
