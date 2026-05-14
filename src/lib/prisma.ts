import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Get DATABASE_URL from environment or construct from individual variables
const getConnectionUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'gestion_del_fin';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

// Create Prisma Client with PostgreSQL adapter
const adapter = new PrismaPg({ connectionString: getConnectionUrl() });
const prisma = new PrismaClient({ adapter });

export { prisma };
