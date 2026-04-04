import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { inventoryByCampParamsSchema, manualAdjustmentSchema } from './inventory.schema.js';
import {
  getCampInventoryHandler,
  getInventoryAuditHandler,
  manualAdjustmentHandler,
} from './inventory.controller.js';

const router = Router();

router.get(
  '/:campId',
  validate(z.object({ params: inventoryByCampParamsSchema })),
  getCampInventoryHandler,
);

router.get(
  '/audit/:campId',
  validate(z.object({ params: inventoryByCampParamsSchema })),
  getInventoryAuditHandler,
);

router.post(
  '/adjustment',
  validate(z.object({ body: manualAdjustmentSchema })),
  manualAdjustmentHandler,
);

export default router;
