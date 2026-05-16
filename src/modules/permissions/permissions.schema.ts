import { z } from 'zod';

const permissionNameSchema = z
  .string({ message: 'name is required' })
  .min(3, 'name cannot be empty')
  .max(80, 'name cannot exceed 80 characters')
  .regex(/^[a-z]+(?:\.[a-z_]+)+$/, 'name must use dot-delimited segments');

const permissionDescriptionSchema = z.string().max(255).optional();

export const createPermissionSchema = z.object({
  name: permissionNameSchema,
  description: permissionDescriptionSchema,
});

export const updatePermissionSchema = createPermissionSchema.partial();

export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionDto = z.infer<typeof updatePermissionSchema>;
