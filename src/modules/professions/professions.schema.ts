import { z } from 'zod';

export const createProfessionSchema = z.object({
  name: z
    .string('name is required')
    .min(1, 'name cannot be empty')
    .max(80, 'name cannot exceed 80 characters'),
  description: z.string().optional(),
});

export const updateProfessionSchema = createProfessionSchema.partial();

export type CreateProfessionDto = z.infer<typeof createProfessionSchema>;
export type UpdateProfessionDto = z.infer<typeof createProfessionSchema>;
