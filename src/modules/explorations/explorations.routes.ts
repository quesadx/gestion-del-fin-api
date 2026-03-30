import { Router } from 'express';
import * as explorationsController from './explorations.controller.js';
import {
  createExplorationSchema,
  updateExplorationSchema,
  updateExplorationStatusSchema,
} from './explorations.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

router.post(
  '/',
  validate(createExplorationSchema),
  explorationsController.createExplorationHandler,
);
router.get('/', explorationsController.listExplorationsHandler);
router.get('/:id', explorationsController.getExplorationHandler);
router.put(
  '/:id',
  validate(updateExplorationSchema),
  explorationsController.updateExplorationHandler,
);
router.patch(
  '/:id/status',
  validate(updateExplorationStatusSchema),
  explorationsController.updateExplorationStatusHandler,
);
router.delete('/:id', explorationsController.deleteExplorationHandler);

export default router;
