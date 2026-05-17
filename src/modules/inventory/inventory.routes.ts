import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { inventoryByCampParamsSchema, manualAdjustmentSchema } from './inventory.schema.js';
import { paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import {
  getCampInventoryHandler,
  getInventoryAuditHandler,
  manualAdjustmentHandler,
} from './inventory.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.get(
  '/:campId',
  permissionMiddleware(PERMISSIONS.INVENTORY_READ),
  validate(z.object({ params: inventoryByCampParamsSchema, query: paginationQuerySchema })),
  getCampInventoryHandler,
);

router.get(
  '/audit/:campId',
  permissionMiddleware(PERMISSIONS.INVENTORY_AUDIT_READ),
  validate(z.object({ params: inventoryByCampParamsSchema, query: paginationQuerySchema })),
  getInventoryAuditHandler,
);

router.post(
  '/adjustment',
  permissionMiddleware(PERMISSIONS.INVENTORY_ADJUST),
  validate(z.object({ body: manualAdjustmentSchema })),
  manualAdjustmentHandler,
);

export default router;
