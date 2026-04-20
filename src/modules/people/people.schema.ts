import { z } from 'zod';

export const campIdParamsSchema = z.object({
  campId: z.coerce.number().int().positive(),
});

export const campIdAndPersonIdParamsSchema = z.object({
  campId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const personStatusEnum = z.enum(['SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD']);

export const createPersonSchema = z.object({
  full_name: z
    .string({ message: 'full_name is required' })
    .min(1, 'full_name cannot be empty')
    .max(150, 'full_name cannot exceed 150 characters'),
  camp_id: z.number({ message: 'camp_id is required' }).int().positive(),
  profession_id: z.number({ message: 'profession_id is required' }).int().positive(),
  admitted_at: z.iso.datetime({ message: 'admitted_at must be a valid ISO datetime' }),
  status: personStatusEnum.optional(),
  age: z.number().int().min(0).max(255).optional(),
  identification_code: z.string().max(20).optional(),
  blood_type: z.string().max(5).optional(),
  skills_summary: z.string().optional(),
  photo_url: z.url().max(500).optional(),
});

export const updatePersonSchema = createPersonSchema.partial();

export const createPersonStatusLogSchema = z.object({
  person_id: z.number({ message: 'person_id is required' }).int().positive(),
  new_status: personStatusEnum,
  reason: z.string().optional(),
});

export const createProfessionReassignmentSchema = z
  .object({
    person_id: z.number({ message: 'person_id is required' }).int().positive(),
    from_profession_id: z.number({ message: 'from_profession_id is required' }).int().positive(),
    to_profession_id: z.number({ message: 'to_profession_id is required' }).int().positive(),
    reason: z.string().optional(),
    start_date: z.iso

      .date({ message: 'start_date must be a valid ISO date (YYYY-MM-DD)' })
      .optional(),
    end_date: z.iso.date({ message: 'end_date must be a valid ISO date (YYYY-MM-DD)' }).optional(),
  })
  .refine((data) => data.from_profession_id !== data.to_profession_id, {
    message: 'from_profession_id and to_profession_id must be different',
    path: ['to_profession_id'],
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    {
      message: 'end_date cannot be earlier than start_date',
      path: ['end_date'],
    },
  );

export const createContributionOverrideSchema = z
  .object({
    person_id: z.number({ message: 'person_id is required' }).int().positive(),
    resource_type_id: z.number({ message: 'resource_type_id is required' }).int().positive(),
    reason: z
      .string({ message: 'reason is required' })
      .trim()
      .min(1, 'reason cannot be empty')
      .max(255, 'reason cannot exceed 255 characters'),
    amount: z
      .number({ message: 'amount is required' })
      .max(999999.99, 'amount exceeds DECIMAL(8,2) range')

      .min(-999999.99, 'amount exceeds DECIMAL(8,2) range'),
    start_date: z.iso
      .date({ message: 'start_date must be a valid ISO date (YYYY-MM-DD)' })
      .optional(),
    end_date: z.iso.date({ message: 'end_date must be a valid ISO date (YYYY-MM-DD)' }).optional(),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    {
      message: 'end_date cannot be earlier than start_date',
      path: ['end_date'],
    },
  );

export type CreatePersonDto = z.infer<typeof createPersonSchema>;
export type UpdatePersonDto = z.infer<typeof updatePersonSchema>;
export type CreatePersonStatusLogDto = z.infer<typeof createPersonStatusLogSchema>;
export type CreateProfessionReassignmentDto = z.infer<typeof createProfessionReassignmentSchema>;
export type CreateContributionOverrideDto = z.infer<typeof createContributionOverrideSchema>;
