import { z } from 'zod';

const roleNameSchema = z
  .string({ message: 'name is required' })
  .trim()
  .min(1, 'name cannot be empty')
  .max(60, 'name cannot exceed 60 characters')
  .regex(/^[a-z_]+$/, 'name must use lowercase letters and underscores');

const roleDescriptionSchema = z.string().max(255).optional();

export const createRoleSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema,
  permission_ids: z.array(z.number().int().positive()).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
