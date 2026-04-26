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
    .nonnegative('daily_ration must be zero or greater')
    .max(999999.99, 'daily_ration exceeds DECIMAL(8,2) range'),
  minimum_stock: z
    .number({ message: 'minimum_stock is required' })
    .nonnegative('minimum_stock must be zero or greater')
    .max(99999999.99, 'minimum_stock exceeds DECIMAL(10,2) range'),
  auto_daily: z.boolean().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export type CreateResourceDto = z.infer<typeof createResourceSchema>;
export type UpdateResourceDto = z.infer<typeof updateResourceSchema>;
