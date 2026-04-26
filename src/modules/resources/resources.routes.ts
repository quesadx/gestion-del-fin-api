import { Router } from 'express';
import { z } from 'zod';
import * as resourcesController from './resources.controller.js';
import { createResourceSchema, updateResourceSchema } from './resources.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  roleMiddleware(['resource_manager']),
  validate(z.object({ body: createResourceSchema })),
  resourcesController.createResourceHandler,
);
router.get(
  '/',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ query: paginationQuerySchema })),
  resourcesController.listResourcesHandler,
);
router.get(
  '/:id',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: idParamsSchema })),
  resourcesController.getResourceHandler,
);
router.put(
  '/:id',
  roleMiddleware(['resource_manager']),
  validate(z.object({ params: idParamsSchema, body: updateResourceSchema })),
  resourcesController.updateResourceHandler,
);
router.delete(
  '/:id',
  roleMiddleware(['resource_manager']),
  validate(z.object({ params: idParamsSchema })),
  resourcesController.deleteResourceHandler,
);

export default router;
