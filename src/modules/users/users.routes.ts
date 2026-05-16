import { Router } from 'express';
import { z } from 'zod';
import * as usersController from './users.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from './users.schema.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/roles',
  roleMiddleware(['system_admin']),
  usersController.getRolesHandler,
);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create user
 *     description: Creates a user account. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, camp_id, role_id]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 60
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               camp_id:
 *                 type: integer
 *                 minimum: 1
 *               role_id:
 *                 type: integer
 *                 minimum: 1
 *               is_active:
 *                 type: boolean
 *               last_activity:
 *                 type: string
 *                 format: date-time
 *               created_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       409:
 *         description: Username or constrained field already exists.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/',
  roleMiddleware(['system_admin']),
  validate(z.object({ body: CreateUserSchema })),
  usersController.createUserHandler,
);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     description: Returns all users. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully.
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/',
  roleMiddleware(['system_admin']),
  validate(z.object({ query: paginationQuerySchema })),
  usersController.getUsersHandler,
);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by id
 *     description: Returns one user by numeric id. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: User retrieved successfully.
 *       400:
 *         description: Invalid path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema })),
  usersController.getUserHandler,
);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     description: Updates a user by id. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 60
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               camp_id:
 *                 type: integer
 *                 minimum: 1
 *               role_id:
 *                 type: integer
 *                 minimum: 1
 *               is_active:
 *                 type: boolean
 *               last_activity:
 *                 type: string
 *                 format: date-time
 *               created_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: User updated successfully.
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
 *         description: User not found.
 *       500:
 *         description: Unexpected server error.
 */
router.put(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema, body: UpdateUserSchema })),
  usersController.updateUserHandler,
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
 *     description: Deletes a user by id. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       204:
 *         description: User deleted successfully.
 *       400:
 *         description: Invalid path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Unexpected server error.
 */
router.delete(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema })),
  usersController.deleteUserHandler,
);

export default router;
