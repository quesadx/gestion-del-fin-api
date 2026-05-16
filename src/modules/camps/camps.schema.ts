import { z } from 'zod';

export const campStatusEnum = z.enum(['ACTIVE', 'ABANDONED']);

export const createCampSchema = z.object({
  name: z
    .string({ message: 'name is required' })
    .trim()
    .min(1, 'name cannot be empty')
    .max(100, 'name cannot exceed 100 characters'),
  location: z.string().max(100, 'location cannot exceed 100 characters').optional(),
  status: campStatusEnum.optional(),
  ai_context_prompt: z.string().optional(),
});

export const updateCampSchema = createCampSchema.partial();

export type CreateCampDto = z.infer<typeof createCampSchema>;
export type UpdateCampDto = z.infer<typeof updateCampSchema>;
