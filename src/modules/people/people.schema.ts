import { z } from 'zod';

export const personStatusEnum = z.enum(['SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD']);

export const createPersonSchema = z.object({
  full_name: z.string({ message: 'full_name is required' }).min(1, 'full_name cannot be empty'),
  camp_id: z.number({ message: 'camp_id is required' }),
  profession_id: z.number({ message: 'profession_id is required' }),
  admitted_at: z.iso.datetime({ message: 'admitted_at must be a valid ISO datetime' }),
  status: personStatusEnum.optional(),
  age: z.number().int().optional(),
  identification_code: z.string().optional(),
  blood_type: z.string().optional(),
  skills_summary: z.string().optional(),
  photo_url: z.url().optional(),
});

export const updatePersonSchema = createPersonSchema.partial();

export type CreatePersonDto = z.infer<typeof createPersonSchema>;
export type UpdatePersonDto = z.infer<typeof updatePersonSchema>;
