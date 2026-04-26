import { Router } from 'express';
import { z } from 'zod';
import * as usersController from './users.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from './users.schema.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  roleMiddleware(['system_admin']),
  validate(z.object({ body: CreateUserSchema })),
  usersController.createUserHandler,
);
router.get('/', roleMiddleware(['system_admin']), usersController.getUsersHandler);
router.get(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema })),
  usersController.getUserHandler,
);
router.put(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema, body: UpdateUserSchema })),
  usersController.updateUserHandler,
);
router.delete(
  '/:id',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema })),
  usersController.deleteUserHandler,
);

export default router;
