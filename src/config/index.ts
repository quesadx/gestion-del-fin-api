// src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Prisma reads all of these from the .env file, so we need to validate them here as well
  DATABASE_URL: z.url('DATABASE_URL has to be a valid URL'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET needs at least 32 characters'),
  JWT_EXPIRY: z.string().default('1h'),

  LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().default('./logs/app.log'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables on startup:');
  console.error(z.treeifyError(result.error));
  process.exit(1);
}

export const config = result.data;
