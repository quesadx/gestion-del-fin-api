import { z } from 'zod';

export const campStatusEnum = z.enum(['ACTIVE', 'ABANDONED']);

export const createCampSchema = z.object({
  name: z.string({ message: 'name is required' }).min(1, 'name cannot be empty'),
  location: z.string({ message: 'location is required' }).optional(),
  status: campStatusEnum.optional(),
  ai_context_prompt: z.string().optional(),
});

export const updateCampSchema = createCampSchema.partial();

// Extract TypeScript types from Zod schemas for type safety
export type CreateCampDto = z.infer<typeof createCampSchema>;
export type UpdateCampDto = z.infer<typeof updateCampSchema>;
