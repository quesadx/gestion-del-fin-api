import { Router } from 'express';
import { z } from 'zod';
import * as usersController from './users.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from './users.schema.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.post(
  '/',
  permissionMiddleware(PERMISSIONS.USERS_CREATE),
  validate(z.object({ body: CreateUserSchema })),
  usersController.createUserHandler,
);

router.get(
  '/',
  permissionMiddleware(PERMISSIONS.USERS_READ),
  validate(z.object({ query: paginationQuerySchema })),
  usersController.getUsersHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.USERS_READ),
  validate(z.object({ params: idParamsSchema })),
  usersController.getUserHandler,
);

router.put(
  '/:id',
  permissionMiddleware(PERMISSIONS.USERS_UPDATE),
  validate(z.object({ params: idParamsSchema, body: UpdateUserSchema })),
  usersController.updateUserHandler,
);

router.delete(
  '/:id',
  permissionMiddleware(PERMISSIONS.USERS_DELETE),
  validate(z.object({ params: idParamsSchema })),
  usersController.deleteUserHandler,
);

export default router;
