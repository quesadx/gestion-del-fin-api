import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z
    .string({ message: 'name is required' })
    .min(1, 'name cannot be empty')
    .max(80, 'name cannot exceed 80 characters'),
  unit: z
    .string({ message: 'unit is required' })
    .min(1, 'unit cannot be empty')
    .max(20, 'unit cannot exceed 20 characters'),
  daily_ration: z
    .number({ message: 'daily_ration is required' })
    .min(0, 'daily_ration must be a positive number'),
  minimum_stock: z
    .number({ message: 'minimum_stock is required' })
    .min(0, 'minimum_stock must be a positive number'),
  auto_daily: z.boolean().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export type CreateResourceDto = z.infer<typeof createResourceSchema>;
export type UpdateResourceDto = z.infer<typeof updateResourceSchema>;
