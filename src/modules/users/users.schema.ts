import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255),
  camp_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  is_active: z.boolean().optional(),
  // last_activity and created_at removed — server-controlled timestamps
});

export const UpdateUserSchema = CreateUserSchema.partial();

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
