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
  '/camps/:campId/admissions',
  validate(
    z.object({ params: z.object({ campId: z.coerce.number() }), body: createAdmissionSchema }),
  ),
  admissionController.create,
);

router.get(
  '/camps/:campId/admissions',
  validate(z.object({ params: z.object({ campId: z.coerce.number() }) })),
  admissionController.list,
);

router.get(
  '/admissions/:id',
  validate(z.object({ params: idParamsSchema })),
  admissionController.getById,
);

router.patch(
  '/admissions/:id/review',
  validate(z.object({ params: idParamsSchema, body: reviewAdmissionSchema })),
  admissionController.review,
);

export default router;
