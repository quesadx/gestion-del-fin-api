import { logger } from './logger/logger.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { sessionMiddleware } from './middlewares/session.middleware.js';
import { campMiddleware } from './middlewares/camp.middleware.js';
import { swaggerSpec } from './docs/swagger.js';
import { globalRateLimit } from './middlewares/rateLimit.middleware.js';
import jobScheduler from './jobs/scheduler.js';
import { closeCache, initCache } from './lib/cache.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import systemRoutes from './modules/system/system.routes.js';
import campsRoutes from './modules/camps/camps.routes.js';

import resourcesRoutes from './modules/resources/resources.routes.js';
import explorationsRoutes from './modules/explorations/explorations.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import professionsRoutes from './modules/professions/professions.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import admissionRoutes from './modules/admission/admission.routes.js';
import transfersRoutes from './modules/transfers/transfers.routes.js';
import metricsRoutes from './modules/metrics/metrics.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';
import permissionsRoutes from './modules/permissions/permissions.routes.js';
const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.get('/', (req, res) => {
  res.json({ message: 'gestion-del-fin-api is alive and kicking!' });
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:5173'],
    credentials: true,
  }),
);

app.use(express.json());

app.set('trust proxy', 1);
app.use(globalRateLimit);

app.use('/api/system', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resources', authMiddleware, sessionMiddleware, campMiddleware, resourcesRoutes);
app.use('/api/expeditions', authMiddleware, sessionMiddleware, campMiddleware, explorationsRoutes);
app.use('/api/camps', authMiddleware, sessionMiddleware, campMiddleware, campsRoutes);
app.use('/api/users', authMiddleware, sessionMiddleware, campMiddleware, userRoutes);
app.use('/api/roles', authMiddleware, sessionMiddleware, campMiddleware, rolesRoutes);
app.use('/api/permissions', authMiddleware, sessionMiddleware, campMiddleware, permissionsRoutes);
app.use('/api/professions', authMiddleware, sessionMiddleware, campMiddleware, professionsRoutes);

app.use('/api/inventory', authMiddleware, sessionMiddleware, campMiddleware, inventoryRoutes);
app.use('/api/admission', authMiddleware, sessionMiddleware, campMiddleware, admissionRoutes);
app.use('/api/transfers', authMiddleware, sessionMiddleware, campMiddleware, transfersRoutes);
app.use('/api/metrics', authMiddleware, sessionMiddleware, campMiddleware, metricsRoutes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (
  NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET === 'dev-only-insecure-jwt-secret-change-me-12345')
) {
  logger.error('JWT_SECRET is required in production and must not be the default.');
  process.exit(1);
}

if (NODE_ENV !== 'test') {
  jobScheduler.startJobScheduler();
}

void initCache();

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} [${NODE_ENV}]`);
});

async function gracefulShutdown(signal: 'SIGINT' | 'SIGTERM') {
  jobScheduler.stopJobScheduler();
  await prisma.$disconnect();
  await closeCache();
  logger.info(`Received ${signal}. DB connection closed. Shutting down gracefully...`);
  process.exit(0);
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
