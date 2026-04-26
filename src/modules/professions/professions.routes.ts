import { Router } from 'express';
import { z } from 'zod';
import * as professionsController from './professions.controller.js';
import { createProfessionSchema, updateProfessionSchema } from './professions.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  roleMiddleware(['system_admin']),
  validate(z.object({ body: createProfessionSchema })),
  professionsController.createProfessionHandler,
);
router.get(
  '/',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  professionsController.listProfessionsHandler,
);
router.get(
  '/:id',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: idParamsSchema })),
  professionsController.getProfessionHandler,
);
router.put(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema, body: updateProfessionSchema })),
  professionsController.updateProfessionHandler,
);
router.delete(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema })),
  professionsController.deleteProfessionHandler,
);

export default router;
