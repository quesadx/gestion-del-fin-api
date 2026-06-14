import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { LoginSchema } from './auth.schema.js';
import { loginRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/login', loginRateLimit, validate(LoginSchema), authController.login);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

export default router;
