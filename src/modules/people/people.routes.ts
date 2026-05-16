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

/**
 * @openapi
 * /api/camps/{campId}/people:
 *   post:
 *     tags: [People]
 *     summary: Create person in camp
 *     description: Creates a person linked to a camp. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload validated by createPersonSchema.
 *     responses:
 *       201:
 *         description: Person created successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.PEOPLE_CREATE),
  validate(z.object({ params: campIdParamsSchema, body: createPersonSchema })),
  createPersonHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people/status-log:
 *   post:
 *     tags: [People]
 *     summary: Add person status log
 *     description: Creates a status log event for a person within a camp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload validated by createPersonStatusLogSchema.
 *     responses:
 *       201:
 *         description: Status log created successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp or person not found.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/status-log',
  permissionMiddleware(PERMISSIONS.PEOPLE_STATUS_LOG_CREATE),
  validate(z.object({ params: campIdParamsSchema, body: createPersonStatusLogSchema })),
  createPersonStatusLogHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people/profession-reassignments:
 *   post:
 *     tags: [People]
 *     summary: Create profession reassignment
 *     description: Reassigns a person to a profession for a camp context.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload validated by createProfessionReassignmentSchema.
 *     responses:
 *       201:
 *         description: Profession reassignment created successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp, person, or profession not found.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/profession-reassignments',
  permissionMiddleware(PERMISSIONS.PEOPLE_PROFESSION_REASSIGN),
  validate(z.object({ params: campIdParamsSchema, body: createProfessionReassignmentSchema })),
  createProfessionReassignmentHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people/contribution-overrides:
 *   post:
 *     tags: [People]
 *     summary: Create contribution override
 *     description: Creates a contribution override for a person in a camp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload validated by createContributionOverrideSchema.
 *     responses:
 *       201:
 *         description: Contribution override created successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp or person not found.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/contribution-overrides',
  permissionMiddleware(PERMISSIONS.PEOPLE_CONTRIBUTION_OVERRIDE_CREATE),
  validate(z.object({ params: campIdParamsSchema, body: createContributionOverrideSchema })),
  createContributionOverrideHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people:
 *   get:
 *     tags: [People]
 *     summary: List people by camp
 *     description: Returns people for a camp with pagination.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 20
 *     responses:
 *       200:
 *         description: People retrieved successfully.
 *       400:
 *         description: Invalid path or query parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/',
  permissionMiddleware(PERMISSIONS.PEOPLE_READ),
  validate(z.object({ params: campIdParamsSchema, query: paginationQuerySchema })),
  getPeopleHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people/{id}:
 *   get:
 *     tags: [People]
 *     summary: Get person by id
 *     description: Returns one person from a camp by numeric id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Person retrieved successfully.
 *       400:
 *         description: Invalid path parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp or person not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.PEOPLE_READ),
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  getPersonHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people/{id}:
 *   put:
 *     tags: [People]
 *     summary: Update person
 *     description: Updates a person in a camp. Requires role system_admin or resource_manager.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload validated by updatePersonSchema.
 *     responses:
 *       200:
 *         description: Person updated successfully.
 *       400:
 *         description: Invalid request payload or path parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp or person not found.
 *       500:
 *         description: Unexpected server error.
 */
router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.PEOPLE_UPDATE),
  validate(z.object({ params: campIdAndPersonIdParamsSchema, body: updatePersonSchema })),
  updatePersonHandler,
);

/**
 * @openapi
 * /api/camps/{campId}/people/{id}:
 *   delete:
 *     tags: [People]
 *     summary: Delete person
 *     description: Deletes a person from a camp. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       204:
 *         description: Person deleted successfully.
 *       400:
 *         description: Invalid path parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp or person not found.
 *       500:
 *         description: Unexpected server error.
 */
router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.PEOPLE_DELETE),
  validate(z.object({ params: campIdAndPersonIdParamsSchema })),
  deletePersonHandler,
);

export default router;
