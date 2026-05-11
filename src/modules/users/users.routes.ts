import { Router } from 'express';
import { z } from 'zod';
import * as usersController from './users.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from './users.schema.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';

const router = Router();

router.post('/', validate(z.object({ body: CreateUserSchema })), usersController.createUserHandler);
router.get('/', usersController.getUsersHandler);
router.get('/:id', validate(z.object({ params: idParamsSchema })), usersController.getUserHandler);
router.put(
  '/:id',
  validate(z.object({ params: idParamsSchema, body: UpdateUserSchema })),
  usersController.updateUserHandler,
);
router.delete(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  usersController.deleteUserHandler,
);

export default router;
