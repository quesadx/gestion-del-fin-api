import { Router } from 'express';
import { z } from 'zod';
import * as professionsController from './professions.controller.js';
import { createProfessionSchema, updateProfessionSchema } from './professions.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_CREATE),
  validate(z.object({ body: createProfessionSchema })),
  professionsController.createProfessionHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  professionsController.listProfessionsHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_READ),
  validate(z.object({ params: idParamsSchema })),
  professionsController.getProfessionHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: updateProfessionSchema })),
  professionsController.updateProfessionHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.PROFESSIONS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  professionsController.deleteProfessionHandler,
);

export default router;
