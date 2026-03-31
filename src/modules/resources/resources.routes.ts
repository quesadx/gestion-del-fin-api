import { Router } from 'express';
import { z } from 'zod';
import * as resourcesController from './resources.controller.js';
import { createResourceSchema, updateResourceSchema } from './resources.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';

const router = Router();

router.post('/', validate(z.object({ body: createResourceSchema })), resourcesController.createResourceHandler);
router.get('/', validate(z.object({ query: paginationQuerySchema })), resourcesController.listResourcesHandler);
router.get('/:id', validate(z.object({ params: idParamsSchema })), resourcesController.getResourceHandler);
router.put(
  '/:id',
  validate(z.object({ params: idParamsSchema, body: updateResourceSchema })),
  resourcesController.updateResourceHandler,
);
router.delete('/:id', validate(z.object({ params: idParamsSchema })), resourcesController.deleteResourceHandler);

export default router;
