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
export const personStatusEnum = z.enum(['SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD']);

const dateTimeSchema = z.iso.datetime({ message: 'must be a valid ISO datetime' });

export const transferItemSchema = z
  .object({
    item_type: transferItemTypeEnum,
    resource_type_id: z.number().int().positive().optional(),
    person_id: z.number().int().positive().optional(),
    quantity: z.number().positive().optional(),
  })
  .superRefine((item, ctx) => {
    if (item.item_type === 'RESOURCE') {
      if (item.resource_type_id == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['resource_type_id'],
          message: 'resource_type_id is required for RESOURCE items',
        });
      }

      if (item.quantity == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: 'quantity is required for RESOURCE items',
        });
      }

      if (item.person_id != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['person_id'],
          message: 'person_id must not be provided for RESOURCE items',
        });
      }
    }

    if (item.item_type === 'PERSON') {
      if (item.person_id == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['person_id'],
          message: 'person_id is required for PERSON items',
        });
      }

      if (item.resource_type_id != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['resource_type_id'],
          message: 'resource_type_id must not be provided for PERSON items',
        });
      }

      if (item.quantity != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: 'quantity must not be provided for PERSON items',
        });
      }
    }
  });

export const createTransferSchema = z
  .object({
    requesting_camp: z.number().int().positive(),
    target_camp: z.number().int().positive(),
    type: transferTypeEnum,
    notes: z.string().optional(),
    requested_by: z.number().int().positive(),
    leader_person_id: z.number().int().positive().optional(),
    required_profession_id: z.number().int().positive().optional(),
    scheduled_delivery_date: dateTimeSchema.optional(),
    items: z.array(transferItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.requesting_camp === data.target_camp) {
      ctx.addIssue({
        code: 'custom',
        path: ['target_camp'],
        message: 'target_camp must be different from requesting_camp',
      });
    }

    const resourceItems = data.items.filter((item) => item.item_type === 'RESOURCE');
    const personItems = data.items.filter((item) => item.item_type === 'PERSON');

    if (data.type === 'RESOURCE' && personItems.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'RESOURCE transfer cannot include PERSON items',
      });
    }

    if (data.type === 'PERSON' && resourceItems.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'PERSON transfer requires RESOURCE items for travel rations',
      });
    }

    if (data.type === 'PERSON' && personItems.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'PERSON transfer must include at least one PERSON item',
      });
    }

    if (data.type === 'MIXED' && (resourceItems.length === 0 || personItems.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'MIXED transfer must include both RESOURCE and PERSON items',
      });
    }

    const seenResourceTypeIds = new Set<number>();
    const seenPersonIds = new Set<number>();

    data.items.forEach((item, index) => {
      if (item.item_type === 'RESOURCE' && item.resource_type_id) {
        if (seenResourceTypeIds.has(item.resource_type_id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['items', index, 'resource_type_id'],
            message: 'duplicate resource_type_id values are not allowed',
          });
        }
        seenResourceTypeIds.add(item.resource_type_id);
      }

      if (item.item_type === 'PERSON' && item.person_id) {
        if (seenPersonIds.has(item.person_id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['items', index, 'person_id'],
            message: 'duplicate person_id values are not allowed',
          });
        }
        seenPersonIds.add(item.person_id);
      }
    });
  });

export const scheduleTransferDeliverySchema = z.object({
  scheduled_delivery_date: dateTimeSchema,
});

export const approveTransferSourceSchema = z.object({
  notes: z.string().optional(),
  scheduled_delivery_date: dateTimeSchema.optional(),
});

export const approveTransferTargetSchema = z.object({
  notes: z.string().optional(),
});

export const completeTransferSchema = z.object({
  notes: z.string().optional(),
  person_status: personStatusEnum.optional(),
});

export const rejectTransferSchema = z.object({
  reason: z.string().trim().min(1, 'reason is required').max(500),
});

export type CreateTransferDto = z.infer<typeof createTransferSchema>;
export type ScheduleTransferDeliveryDto = z.infer<typeof scheduleTransferDeliverySchema>;
export type ApproveTransferSourceDto = z.infer<typeof approveTransferSourceSchema>;
export type ApproveTransferTargetDto = z.infer<typeof approveTransferTargetSchema>;
export type CompleteTransferDto = z.infer<typeof completeTransferSchema>;
export type RejectTransferDto = z.infer<typeof rejectTransferSchema>;
