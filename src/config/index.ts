// src/config/index.ts
import 'dotenv/config';
import { z } from 'zod';
import { envSchema } from './env.schema.js';

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables on startup:');
  console.error(z.treeifyError(result.error));
  process.exit(1);
}

if (!result.data.JWT_SECRET && result.data.NODE_ENV === 'production') {
  console.error('JWT_SECRET is required in production and must have at least 32 characters.');
  process.exit(1);
}

const jwtSecret = result.data.JWT_SECRET ?? 'dev-only-insecure-jwt-secret-change-me-12345';

if (!result.data.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using temporary development fallback secret.');
}

export const config = {
  ...result.data,
  JWT_SECRET: jwtSecret,
};
