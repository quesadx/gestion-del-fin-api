import 'dotenv/config';
import { logger } from './logger/logger.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middlewares/error.middleware.js';

import express from 'express';
import systemRoutes from './modules/system/system.routes.js';
import peopleRoutes from './modules/people/people.routes.js';
import campsRoutes from './modules/camps/camps.routes.js';

import resourcesRoutes from './modules/resources/resources.routes.js';
import explorationsRoutes from './modules/explorations/explorations.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';

const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'gestion-del-fin-api is alive and kicking!' });
});

app.use(express.json());
app.use('/api/system', systemRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/camps', campsRoutes);

app.use('/api/resources', resourcesRoutes);
app.use('/api/expeditions', explorationsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (
  NODE_ENV === 'production' &&
  process.env.JWT_SECRET === 'dev-only-insecure-jwt-secret-change-me-12345'
) {
  console.error('JWT_SECRET is required in production and must not be the default.');
  process.exit(1);
}

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} [${NODE_ENV}]`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('DB connection closed. Shutting down gracefully...');
  process.exit(0);
});
