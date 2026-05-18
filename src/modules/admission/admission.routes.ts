import { Router } from 'express';
import { z } from 'zod';
import * as admissionController from './admission.controller.js';
import { createAdmissionSchema, reviewAdmissionSchema } from './admission.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { admissionRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

router.post(
  '/camps/:campId',
  permissionMiddleware(PERMISSIONS.ADMISSION_CREATE),
  validate(
    z.object({
      params: z.object({ campId: z.coerce.number().int().positive() }),
      body: createAdmissionSchema,
    }),
  ),
  admissionRateLimit,
  admissionController.createAdmissionHandler,
);

router.get(
  '/camps/:campId',
  permissionMiddleware(PERMISSIONS.ADMISSION_READ),
  validate(
    z.object({
      params: z.object({ campId: z.coerce.number().int().positive() }),
      query: paginationQuerySchema,
    }),
  ),
  admissionController.getAdmissionsHandler,
);

router.get(
  '/:id',
  permissionMiddleware(PERMISSIONS.ADMISSION_READ),
  validate(z.object({ params: idParamsSchema })),
  admissionController.getAdmissionHandler,
);

router.patch(
  '/:id/review',
  permissionMiddleware(PERMISSIONS.ADMISSION_REVIEW),
  validate(z.object({ params: idParamsSchema, body: reviewAdmissionSchema })),
  admissionController.reviewAdmissionHandler,
);

export default router;
