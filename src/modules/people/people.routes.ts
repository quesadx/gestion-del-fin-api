import { Router } from 'express';
import { z } from 'zod';
import {
  createContributionOverrideHandler,
  createPersonHandler,
  createPersonStatusLogHandler,
  createProfessionReassignmentHandler,
  updatePersonHandler,
  deletePersonHandler,
  getPersonHandler,
  getPeopleHandler,
} from './people.controller.js';
import {
  campIdAndPersonIdParamsSchema,
  campIdParamsSchema,
  createContributionOverrideSchema,
  createPersonSchema,
  createPersonStatusLogSchema,
  createProfessionReassignmentSchema,
  updatePersonSchema,
} from './people.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { paginationQuerySchema } from '../../shared/schemas/http.schema.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate(z.object({ params: campIdParamsSchema, body: createPersonSchema })),
  createPersonHandler,
);
router.post(
  '/status-log',
  validate(z.object({ params: campIdParamsSchema, body: createPersonStatusLogSchema })),
  createPersonStatusLogHandler,
);
router.post(
  '/profession-reassignments',
  validate(z.object({ params: campIdParamsSchema, body: createProfessionReassignmentSchema })),
  createProfessionReassignmentHandler,
);
router.post(
  '/contribution-overrides',
  validate(z.object({ params: campIdParamsSchema, body: createContributionOverrideSchema })),
  createContributionOverrideHandler,
);
router.get(
  '/',
  validate(z.object({ params: campIdParamsSchema, query: paginationQuerySchema })),
  getPeopleHandler,
);
router.get('/:id', validate(z.object({ params: campIdAndPersonIdParamsSchema })), getPersonHandler);
router.put(
  '/:id',
  validate(z.object({ params: campIdAndPersonIdParamsSchema, body: updatePersonSchema })),
  updatePersonHandler,
);
router.delete(
  '/:id',
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  deletePersonHandler,
);

export default router;
