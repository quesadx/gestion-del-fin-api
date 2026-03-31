import { z } from 'zod';

export const transferStatusEnum = z.enum([
  'PENDING',
  'APPROVED_SOURCE',
  'APPROVED_TARGET',
  'COMPLETED',
  'REJECTED',
]);

export const transferTypeEnum = z.enum(['RESOURCE', 'PERSON', 'MIXED']);
export const transferItemTypeEnum = z.enum(['RESOURCE', 'PERSON']);

export const transferItemSchema = z
  .object({
    item_type: transferItemTypeEnum,
    resource_type_id: z.number().int().positive().optional(),
    person_id: z.number().int().positive().optional(),
    quantity: z.number().positive().optional(),
  })
  .superRefine((item, ctx) => {
    if (item.item_type === 'RESOURCE') {
      if (!item.resource_type_id) {
        ctx.addIssue({
          code: 'custom',
          path: ['resource_type_id'],
          message: 'resource_type_id is required for RESOURCE items',
        });
      }

      if (item.person_id) {
        ctx.addIssue({
          code: 'custom',
          path: ['person_id'],
          message: 'person_id must not be provided for RESOURCE items',
        });
      }
    }

    if (item.item_type === 'PERSON') {
      if (!item.person_id) {
        ctx.addIssue({
          code: 'custom',
          path: ['person_id'],
          message: 'person_id is required for PERSON items',
        });
      }

      if (item.resource_type_id) {
        ctx.addIssue({
          code: 'custom',
          path: ['resource_type_id'],
          message: 'resource_type_id must not be provided for PERSON items',
        });
      }
    }
  });

export const createTransferSchema = z.object({
  requesting_camp: z.number().int().positive(),
  target_camp: z.number().int().positive(),
  type: transferTypeEnum,
  notes: z.string().optional(),
  requested_by: z.number().int().positive(),
  leader_person_id: z.number().int().positive().optional(),
  scheduled_delivery_date: z.iso.datetime().optional(),
  items: z.array(transferItemSchema).min(1),
});

export const updateTransferStatusSchema = z.object({
  status: transferStatusEnum,
  approved_by_source: z.number().int().positive().optional(),
  approved_by_target: z.number().int().positive().optional(),
  approved_source_at: z.iso.datetime().optional(),
  approved_target_at: z.iso.datetime().optional(),
  notes: z.string().optional(),
});

export type CreateTransferDto = z.infer<typeof createTransferSchema>;
export type UpdateTransferStatusDto = z.infer<typeof updateTransferStatusSchema>;
