import { Router } from 'express';
import { z } from 'zod';
import * as admissionController from './admission.controller.js';
import { createAdmissionSchema, reviewAdmissionSchema } from './admission.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/admission/camps/{campId}:
 *   post:
 *     tags: [Admission]
 *     summary: Create admission request
 *     description: Creates an admission request for a specific camp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload validated by createAdmissionSchema.
 *     responses:
 *       201:
 *         description: Admission request created successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
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

/**
 * @openapi
 * /api/admission/camps/{campId}:
 *   get:
 *     tags: [Admission]
 *     summary: List admissions by camp
 *     description: Returns admission requests for a camp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Admissions retrieved successfully.
 *       400:
 *         description: Invalid path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/camps/:campId',
  validate(
    z.object({
      params: z.object({ campId: z.coerce.number().int().positive() }),
      query: paginationQuerySchema,
    }),
  ),
  admissionController.getAdmissionsHandler,
);

/**
 * @openapi
 * /api/admission/{id}:
 *   get:
 *     tags: [Admission]
 *     summary: Get admission by id
 *     description: Returns one admission request by numeric id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Admission retrieved successfully.
 *       400:
 *         description: Invalid path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Admission not found.
 *       500:
 *         description: Unexpected server error.
 */
router.get(
  '/:id',
  validate(z.object({ params: idParamsSchema })),
  admissionController.getAdmissionHandler,
);

/**
 * @openapi
 * /api/admission/{id}/review:
 *   patch:
 *     tags: [Admission]
 *     summary: Review admission
 *     description: Approves or rejects an admission request. Requires role system_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Review payload validated by reviewAdmissionSchema.
 *     responses:
 *       200:
 *         description: Admission reviewed successfully.
 *       400:
 *         description: Invalid request payload or path parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Admission not found.
 *       500:
 *         description: Unexpected server error.
 */
router.patch(
  '/:id/review',
  roleMiddleware(['system_admin']),
  validate(z.object({ params: idParamsSchema, body: reviewAdmissionSchema })),
  admissionController.reviewAdmissionHandler,
);

export default router;
