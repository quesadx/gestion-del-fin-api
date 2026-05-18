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
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.PEOPLE_CREATE),
  validate(z.object({ params: campIdParamsSchema, body: createPersonSchema })),
  createPersonHandler,
);

router.post(
  '/status-log',
  permissionMiddleware(PERMISSIONS.PEOPLE_STATUS_LOG_CREATE),
  validate(z.object({ params: campIdParamsSchema, body: createPersonStatusLogSchema })),
  createPersonStatusLogHandler,
);

router.post(
  '/profession-reassignments',
  permissionMiddleware(PERMISSIONS.PEOPLE_PROFESSION_REASSIGN),
  validate(z.object({ params: campIdParamsSchema, body: createProfessionReassignmentSchema })),
  createProfessionReassignmentHandler,
);

router.post(
  '/contribution-overrides',
  permissionMiddleware(PERMISSIONS.PEOPLE_CONTRIBUTION_OVERRIDE_CREATE),
  validate(z.object({ params: campIdParamsSchema, body: createContributionOverrideSchema })),
  createContributionOverrideHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.PEOPLE_READ),
  validate(z.object({ params: campIdParamsSchema, query: paginationQuerySchema })),
  getPeopleHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.PEOPLE_READ),
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  getPersonHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.PEOPLE_UPDATE),
  validate(z.object({ params: campIdAndPersonIdParamsSchema, body: updatePersonSchema })),
  updatePersonHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.PEOPLE_DELETE),
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  deletePersonHandler,
);

export default router;
