import { defineConfig } from 'prisma/config';

// Only load dotenv in non-production environments
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  config();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_DIRECT_URL'] ?? process.env['DATABASE_URL'],
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});