import { Router } from 'express';
import { z } from 'zod';
import * as admissionController from './admission.controller.js';
import { createAdmissionSchema, reviewAdmissionSchema } from './admission.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();
router.post(
  '/camps/:campId',
  validate(
    z.object({
      params: z.object({ campId: z.coerce.number().int().positive() }),
      body: createAdmissionSchema,
    }),
  ),
  admissionController.createAdmissionHandler,
);

router.get(
  '/camps/:campId',
  validate(z.object({ params: z.object({ campId: z.coerce.number().int().positive() }) })),
  admissionController.getAdmissionsHandler,
);

router.get(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  admissionController.getAdmissionHandler,
);

router.patch(
  '/:id/review',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema, body: reviewAdmissionSchema })),
  admissionController.reviewAdmissionHandler,
);

export default router;
