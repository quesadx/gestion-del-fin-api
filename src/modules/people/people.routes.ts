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
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: campIdParamsSchema, body: createPersonSchema })),
  createPersonHandler,
);
router.post(
  '/status-log',
  roleMiddleware(['system_admin', 'resource_manager']),
  validate(z.object({ params: campIdParamsSchema, body: createPersonStatusLogSchema })),
  createPersonStatusLogHandler,
);
router.post(
  '/profession-reassignments',
  roleMiddleware(['system_admin', 'resource_manager']),
  validate(z.object({ params: campIdParamsSchema, body: createProfessionReassignmentSchema })),
  createProfessionReassignmentHandler,
);
router.post(
  '/contribution-overrides',
  roleMiddleware(['resource_manager']),
  validate(z.object({ params: campIdParamsSchema, body: createContributionOverrideSchema })),
  createContributionOverrideHandler,
);
router.get(
  '/',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: campIdParamsSchema, query: paginationQuerySchema })),
  getPeopleHandler,
);
router.get(
  '/:id',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  getPersonHandler,
);
router.put(
  '/:id',
  roleMiddleware(['system_admin', 'resource_manager']),
  validate(z.object({ params: campIdAndPersonIdParamsSchema, body: updatePersonSchema })),
  updatePersonHandler,
);
router.delete(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  deletePersonHandler,
);

export default router;
