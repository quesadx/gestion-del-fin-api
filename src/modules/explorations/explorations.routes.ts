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

const router = Router();

router.post(
  '/',
  validate(z.object({ body: createExplorationSchema })),
  explorationsController.createExplorationHandler,
);
router.get('/', explorationsController.listExplorationsHandler);
router.get(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  explorationsController.getExplorationHandler,
);
router.put(
  '/:id',
  validate(z.object({ params: idParamsSchema, body: updateExplorationSchema })),
  explorationsController.updateExplorationHandler,
);
router.patch(
  '/:id/status',
  validate(z.object({ params: idParamsSchema, body: updateExplorationStatusSchema })),
  explorationsController.updateExplorationStatusHandler,
);
router.delete(
  '/:id',
  validate(z.object({ params: idParamsSchema, body: deleteExplorationSchema })),
  explorationsController.deleteExplorationHandler,
);
export default router;
