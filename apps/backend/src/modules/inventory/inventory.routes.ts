import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware.js';
import { inventoryByCampParamsSchema, manualAdjustmentSchema } from './inventory.schema.js';
import {
  getCampInventoryHandler,
  getInventoryAuditHandler,
  manualAdjustmentHandler,
} from './inventory.controller.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/inventory/{campId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory snapshot by camp
 *     description: Returns current inventory balances for a camp.
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
 *         description: Inventory retrieved successfully.
 *       400:
 *         description: Invalid camp id.
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
  '/:campId',
  roleMiddleware(['system_admin', 'worker', 'resource_manager', 'travel_coordinator']),
  validate(z.object({ params: inventoryByCampParamsSchema })),
  getCampInventoryHandler,
);

/**
 * @openapi
 * /api/inventory/audit/{campId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory audit trail by camp
 *     description: Returns inventory adjustment and movement audit records for a camp.
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
 *         description: Inventory audit retrieved successfully.
 *       400:
 *         description: Invalid camp id.
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
  '/audit/:campId',
  roleMiddleware(['system_admin', 'resource_manager']),
  validate(z.object({ params: inventoryByCampParamsSchema })),
  getInventoryAuditHandler,
);

/**
 * @openapi
 * /api/inventory/adjustment:
 *   post:
 *     tags: [Inventory]
 *     summary: Create manual inventory adjustment
 *     description: Applies a manual stock adjustment entry for a camp/resource combination.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [camp_id, resource_id, quantity_delta]
 *             properties:
 *               camp_id:
 *                 type: integer
 *                 minimum: 1
 *               resource_id:
 *                 type: integer
 *                 minimum: 1
 *               quantity_delta:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Adjustment created successfully.
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication.
 *       403:
 *         description: Forbidden for current user role.
 *       404:
 *         description: Camp or resource not found.
 *       500:
 *         description: Unexpected server error.
 */
router.post(
  '/adjustment',
  roleMiddleware(['worker', 'resource_manager']),
  validate(z.object({ body: manualAdjustmentSchema })),
  manualAdjustmentHandler,
);

export default router;
