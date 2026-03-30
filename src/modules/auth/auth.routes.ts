import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { LoginSchema } from './auth.schema.js';

const router = Router();

router.post('/login', validate(LoginSchema), authController.login);

export default router;
