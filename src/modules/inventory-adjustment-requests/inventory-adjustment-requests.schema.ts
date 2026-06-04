import { z } from 'zod';

export const createAdjustmentRequestSchema = z.object({
  camp_id: z.number({ message: 'camp_id is required' }).int().positive(),
  resource_type_id: z.number({ message: 'resource_type_id is required' }).int().positive(),
  adjustment_type: z.enum(['MANUAL_IN', 'MANUAL_OUT']),
  quantity: z
    .number({ message: 'quantity is required' })
    .positive('quantity must be greater than zero')
    .max(9999999999.99, 'quantity exceeds DECIMAL(12,2) range'),
  reason: z.string().max(255).optional(),
});

export const reviewAdjustmentRequestParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateAdjustmentRequestDto = z.infer<typeof createAdjustmentRequestSchema>;
