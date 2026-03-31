import express from 'express';
import * as usersController from './users.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from './users.schema.js';

const router = express.Router();

router.post('/', validate(CreateUserSchema), usersController.createUserHandler);
router.get('/', usersController.getUsersHandler);
router.get('/:id', usersController.getUserHandler);
router.put('/:id', validate(UpdateUserSchema), usersController.updateUserHandler);
router.delete('/:id', usersController.deleteUserHandler);

export default router;
