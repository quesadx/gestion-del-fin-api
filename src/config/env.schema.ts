import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.url('DATABASE_URL has to be a valid URL'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET needs at least 32 characters').optional(),
  JWT_EXPIRY: z.union([z.string(), z.number()]).default('1h'),

  LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().default('./logs/app.log'),
});

export type EnvConfig = z.infer<typeof envSchema>;
