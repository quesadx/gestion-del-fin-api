import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const dbUrl = process.env['DATABASE_MIGRATION_URL'] ?? process.env['DATABASE_URL'];

if (!dbUrl) {
  throw new Error('DATABASE_URL no está definida');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: dbUrl,
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
