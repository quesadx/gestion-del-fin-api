import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { inventoryByCampParamsSchema, manualAdjustmentSchema } from './inventory.schema.js';
import {
  getCampInventoryHandler,
  getInventoryAuditHandler,
  manualAdjustmentHandler,
} from './inventory.controller.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/:campId',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: inventoryByCampParamsSchema })),
  getCampInventoryHandler,
);

router.get(
  '/audit/:campId',
  roleMiddleware(['system_admin', 'resource_manager']),
  validate(z.object({ params: inventoryByCampParamsSchema })),
  getInventoryAuditHandler,
);

router.post(
  '/adjustment',
  roleMiddleware(['worker', 'resource_manager']),
  validate(z.object({ body: manualAdjustmentSchema })),
  manualAdjustmentHandler,
);

export default router;
