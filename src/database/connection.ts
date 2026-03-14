import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/logger';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Test connection
export async function testConnection(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected via Prisma');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
