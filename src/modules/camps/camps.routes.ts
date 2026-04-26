import { Router } from 'express';
import { z } from 'zod';
import * as campsController from './camps.controller.js';
import { createCampSchema, updateCampSchema } from './camps.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import peopleRoutes from '../people/people.routes.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  roleMiddleware(['system_admin']),
  validate(z.object({ body: createCampSchema })),
  campsController.createCampHandler,
);
router.get(
  '/',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  campsController.getCampsHandler,
);
router.get(
  '/:id',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: idParamsSchema })),
  campsController.getCampHandler,
);
router.put(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema, body: updateCampSchema })),
  campsController.updateCampHandler,
);
router.delete(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema })),
  campsController.deleteCampHandler,
);

router.use('/:campId/people', peopleRoutes);

export default router;
