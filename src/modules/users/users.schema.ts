import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(255),
  camp_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  is_active: z.boolean(),
  last_activity: z.iso.datetime().optional(),
  created_at: z.iso.datetime(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
