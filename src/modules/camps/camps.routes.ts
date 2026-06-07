import { Router } from 'express';
import { z } from 'zod';
import * as campsController from './camps.controller.js';
import { createCampSchema, updateCampSchema } from './camps.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import peopleRoutes from '../people/people.routes.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.CAMPS_CREATE),
  validate(z.object({ body: createCampSchema })),
  campsController.createCampHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.CAMPS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  campsController.getCampsHandler,
);

router.get(
  '/catalog',
  permissionMiddleware(PERMISSIONS.CAMPS_READ),
  campsController.getCampsCatalogHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.CAMPS_READ),
  validate(z.object({ params: idParamsSchema })),
  campsController.getCampHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.CAMPS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateCampSchema })),
  campsController.updateCampHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.CAMPS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  campsController.deleteCampHandler,
);

router.use('/:campId/people', peopleRoutes);

export default router;
