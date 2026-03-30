import { z } from 'zod';

export const expeditionStatusEnum = z.enum(['PLANNED', 'ONGOING', 'RETURNED', 'CANCELLED']);
const personStatusEnum = z.enum(['SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD']);

const dateStringSchema = z.string().refine((val) => !isNaN(new Date(val).getTime()), {
  message: 'must be a valid date string',
});

const resourceAllocationSchema = z.object({
  resource_type_id: z.number().int().positive(),
  amount: z.number().positive(),
});

const explorationMemberSchema = z.object({
  person_id: z.number().int().positive(),
});

const explorationBaseSchema = z.object({
  camp_id: z.number({ message: 'camp_id is required' }).int().positive(),
  created_by: z.number({ message: 'created_by is required' }).int().positive(),
  destination: z
    .string({ message: 'destination is required' })
    .min(1, 'destination cannot be empty')
    .max(255, 'destination cannot exceed 255 characters'),
  departure_date: dateStringSchema,
  expected_return_date: dateStringSchema,
  max_return_date: dateStringSchema,
  actual_return_date: dateStringSchema.optional(),
  status: expeditionStatusEnum.optional(),
  notes: z.string().optional(),
  members: z.array(explorationMemberSchema).default([]),

  allocated_resources: z.array(resourceAllocationSchema).default([]),
});

export const createExplorationSchema = explorationBaseSchema.superRefine((data, ctx) => {
  const departure = new Date(data.departure_date).getTime();
  const expected = new Date(data.expected_return_date).getTime();
  const max = new Date(data.max_return_date).getTime();

  if (!(departure < expected && expected < max)) {
    ctx.addIssue({
      code: 'custom',
      path: ['expected_return_date'],
      message: 'departure_date < expected_return_date < max_return_date is required',
    });
  }

  const seenResourceTypes = new Set<number>();
  data.allocated_resources.forEach((resource, index) => {
    if (seenResourceTypes.has(resource.resource_type_id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['allocated_resources', index, 'resource_type_id'],
        message: 'duplicate resource_type_id values are not allowed',
      });
    }
    seenResourceTypes.add(resource.resource_type_id);
  });
});

export const updateExplorationSchema = explorationBaseSchema
  .omit({ status: true })
  .partial()
  .strict();

export const updateExplorationStatusSchema = z
  .object({
    status: expeditionStatusEnum,
    actual_return_date: dateStringSchema.optional(),
    notes: z.string().optional(),
    changed_by: z.number().int().positive(),
    // If omitted when RETURNED, service falls back to allocated resources.
    resources_to_return: z.array(resourceAllocationSchema).optional(),
    members: z.array(explorationMemberSchema).optional(),
    return_member_status: personStatusEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'RETURNED' && !data.actual_return_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['actual_return_date'],
        message: 'actual_return_date is required when status is RETURNED',
      });
    }
  });

export type CreateExplorationDto = z.infer<typeof createExplorationSchema>;
export type UpdateExplorationDto = z.infer<typeof updateExplorationSchema>;
export type UpdateExplorationStatusDto = z.infer<typeof updateExplorationStatusSchema>;
