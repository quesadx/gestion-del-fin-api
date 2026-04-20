import { Router } from 'express';
import { z } from 'zod';
import * as campsController from './camps.controller.js';
import { createCampSchema, updateCampSchema } from './camps.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import peopleRoutes from '../people/people.routes.js';

const router = Router();

router.post('/', validate(z.object({ body: createCampSchema })), campsController.createCampHandler);
router.get('/', campsController.getCampsHandler);
router.get('/:id', validate(z.object({ params: idParamsSchema })), campsController.getCampHandler);
router.put(
  '/:id',
  validate(z.object({ params: idParamsSchema, body: updateCampSchema })),
  campsController.updateCampHandler,
);
router.delete(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  campsController.deleteCampHandler,
);

router.use('/:campId/people', peopleRoutes);

export default router;
