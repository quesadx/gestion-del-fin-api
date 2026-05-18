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

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_CREATE),
  validate(z.object({ body: createExplorationSchema })),
  explorationsController.createExplorationHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  explorationsController.listExplorationsHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_READ),
  validate(z.object({ params: idParamsSchema })),
  explorationsController.getExplorationHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateExplorationSchema })),
  explorationsController.updateExplorationHandler,
);

router.patch(
  '/:id/status',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_UPDATE_STATUS),
  validate(z.object({ params: idParamsSchema, body: updateExplorationStatusSchema })),
  explorationsController.updateExplorationStatusHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.EXPEDITIONS_DELETE),
  validate(z.object({ params: idParamsSchema, body: deleteExplorationSchema })),
  explorationsController.deleteExplorationHandler,
);
export default router;
