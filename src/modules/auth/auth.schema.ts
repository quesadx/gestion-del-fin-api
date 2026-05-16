import { z } from 'zod';

export const LoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .max(60, 'Username must be at most 60 characters'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
