import { Router } from 'express';
import { z } from 'zod';
import * as admissionController from './admission.controller.js';
import { createAdmissionSchema, reviewAdmissionSchema } from './admission.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/camps/:campId',
  validate(
    z.object({ params: z.object({ campId: z.coerce.number() }), body: createAdmissionSchema }),
  ),
  admissionController.createAdmissionHandler,
);

router.get(
  '/camps/:campId',
  validate(z.object({ params: z.object({ campId: z.coerce.number() }) })),
  admissionController.getAdmissionsHandler,
);

router.get(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  admissionController.getAdmissionHandler,
);

router.patch(
  '/:id/review',
  validate(z.object({ params: idParamsSchema, body: reviewAdmissionSchema })),
  admissionController.reviewAdmissionHandler,
);

export default router;
