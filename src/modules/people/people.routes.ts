import { Router } from 'express';
import { z } from 'zod';
import {
  createPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
  getPersonHandler,
  getPeopleHandler,
} from './people.controller.js';
import { createPersonSchema, updatePersonSchema } from './people.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';

const router = Router();

router.post('/', validate(z.object({ body: createPersonSchema })), createPersonHandler);
router.get('/', validate(z.object({ query: paginationQuerySchema })), getPeopleHandler);
router.get('/:id', validate(z.object({ params: idParamsSchema })), getPersonHandler);
router.put(
  '/:id',
  validate(z.object({ params: idParamsSchema, body: updatePersonSchema })),
  updatePersonHandler,
);
router.delete('/:id', validate(z.object({ params: idParamsSchema })), deletePersonHandler);

export default router;
