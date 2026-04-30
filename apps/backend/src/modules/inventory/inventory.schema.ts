import { z } from 'zod';

export const inventoryByCampParamsSchema = z.object({
  campId: z.coerce.number().int().positive(),
});

export const manualAdjustmentTypeSchema = z.enum(['MANUAL_IN', 'MANUAL_OUT']);

export const manualAdjustmentSchema = z.object({
  camp_id: z.number({ message: 'camp_id is required' }).int().positive(),
  resource_type_id: z.number({ message: 'resource_type_id is required' }).int().positive(),
  type: manualAdjustmentTypeSchema,
  quantity: z
    .number({ message: 'quantity is required' })
    .positive('quantity must be greater than zero')
    .max(9999999999.99, 'quantity exceeds DECIMAL(12,2) range'),
  description: z.string().max(255).optional(),
});

export type ManualAdjustmentDto = z.infer<typeof manualAdjustmentSchema>;
