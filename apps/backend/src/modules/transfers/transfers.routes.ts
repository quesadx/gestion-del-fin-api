import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import {
  approveTransferSourceSchema,
  approveTransferTargetSchema,
  completeTransferSchema,
  createTransferSchema,
  rejectTransferSchema,
  scheduleTransferDeliverySchema,
} from './transfers.schema.js';
import * as transfersController from './transfers.controller.js';

const router = Router();

router.post(
  '/',
  validate(z.object({ body: createTransferSchema })),
  transfersController.createTransferHandler,
);

router.get('/', transfersController.listTransfersHandler);

router.get(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  transfersController.getTransferHandler,
);

router.patch(
  '/:id/schedule',
  validate(z.object({ params: idParamsSchema, body: scheduleTransferDeliverySchema })),
  transfersController.scheduleTransferDeliveryHandler,
);

router.patch(
  '/:id/approve-source',
  validate(z.object({ params: idParamsSchema, body: approveTransferSourceSchema })),
  transfersController.approveTransferBySourceHandler,
);

router.patch(
  '/:id/approve-target',
  validate(z.object({ params: idParamsSchema, body: approveTransferTargetSchema })),
  transfersController.approveTransferByTargetHandler,
);

router.patch(
  '/:id/complete',
  validate(z.object({ params: idParamsSchema, body: completeTransferSchema })),
  transfersController.completeTransferHandler,
);

router.patch(
  '/:id/reject',
  validate(z.object({ params: idParamsSchema, body: rejectTransferSchema })),
  transfersController.rejectTransferHandler,
);

export default router;
