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
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  roleMiddleware(['travel_coordinator']),
  validate(z.object({ body: createExplorationSchema })),
  explorationsController.createExplorationHandler,
);
router.get(
  '/',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  explorationsController.listExplorationsHandler,
);
router.get(
  '/:id',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: idParamsSchema })),
  explorationsController.getExplorationHandler,
);
router.put(
  '/:id',
  roleMiddleware(['travel_coordinator']),
  validate(z.object({ params: idParamsSchema, body: updateExplorationSchema })),
  explorationsController.updateExplorationHandler,
);
router.patch(
  '/:id/status',
  roleMiddleware(['travel_coordinator']),
  validate(z.object({ params: idParamsSchema, body: updateExplorationStatusSchema })),
  explorationsController.updateExplorationStatusHandler,
);
router.delete(
  '/:id',
  roleMiddleware(['travel_coordinator']),
  validate(z.object({ params: idParamsSchema, body: deleteExplorationSchema })),
  explorationsController.deleteExplorationHandler,
);
export default router;
