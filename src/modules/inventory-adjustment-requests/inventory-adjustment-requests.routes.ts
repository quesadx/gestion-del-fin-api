import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createAdjustmentRequestSchema,
  reviewAdjustmentRequestParamsSchema,
} from './inventory-adjustment-requests.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import * as controller from './inventory-adjustment-requests.controller.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.INVENTORY_ADJUSTMENT_REQUESTS_CREATE),
  validate(z.object({ body: createAdjustmentRequestSchema })),
  controller.create,
);

router.get(
  '/my',
  permissionMiddleware(PERMISSIONS.INVENTORY_ADJUSTMENT_REQUESTS_READ_OWN),
  controller.getMy,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.INVENTORY_ADJUSTMENT_REQUESTS_READ),
  controller.getAll,
);

router.patch(
  '/:id/approve',
  permissionMiddleware(PERMISSIONS.INVENTORY_ADJUSTMENT_REQUESTS_REVIEW),
  validate(z.object({ params: reviewAdjustmentRequestParamsSchema })),
  controller.approve,
);

router.patch(
  '/:id/reject',
  permissionMiddleware(PERMISSIONS.INVENTORY_ADJUSTMENT_REQUESTS_REVIEW),
  validate(z.object({ params: reviewAdjustmentRequestParamsSchema })),
  controller.reject,
);

export default router;
