import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import {
  approveTransferSourceSchema,
  approveTransferTargetSchema,
  completeTransferSchema,
  createTransferSchema,
  rejectTransferSchema,
  scheduleTransferDeliverySchema,
} from './transfers.schema.js';
import * as transfersController from './transfers.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.TRANSFERS_CREATE),
  validate(z.object({ body: createTransferSchema })),
  transfersController.createTransferHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.TRANSFERS_READ),
  validate(z.object({ query: paginationQuerySchema.extend({ camp_id: z.coerce.number().int().positive().optional() }) })),
  transfersController.listTransfersHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.TRANSFERS_READ),
  validate(z.object({ params: idParamsSchema })),
  transfersController.getTransferHandler,
);

router.patch(
  '/:id/schedule',
  permissionMiddleware(PERMISSIONS.TRANSFERS_SCHEDULE),
  validate(z.object({ params: idParamsSchema, body: scheduleTransferDeliverySchema })),
  transfersController.scheduleTransferDeliveryHandler,
);

router.patch(
  '/:id/approve-source',
  permissionMiddleware(PERMISSIONS.TRANSFERS_APPROVE_SOURCE),
  validate(z.object({ params: idParamsSchema, body: approveTransferSourceSchema })),
  transfersController.approveTransferBySourceHandler,
);

router.patch(
  '/:id/approve-target',
  permissionMiddleware(PERMISSIONS.TRANSFERS_APPROVE_TARGET),
  validate(z.object({ params: idParamsSchema, body: approveTransferTargetSchema })),
  transfersController.approveTransferByTargetHandler,
);

router.patch(
  '/:id/complete',
  permissionMiddleware(PERMISSIONS.TRANSFERS_COMPLETE),
  validate(z.object({ params: idParamsSchema, body: completeTransferSchema })),
  transfersController.completeTransferHandler,
);

router.patch(
  '/:id/reject',
  permissionMiddleware(PERMISSIONS.TRANSFERS_REJECT),
  validate(z.object({ params: idParamsSchema, body: rejectTransferSchema })),
  transfersController.rejectTransferHandler,
);

export default router;
