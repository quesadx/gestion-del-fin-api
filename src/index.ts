import { config } from './config/index.js';
import { logger } from './logger/index.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middlewares/error.middleware.js';

import express from 'express';
import systemRoutes from './modules/system/system.routes.js';
import peopleRoutes from './modules/people/people.routes.js';
import campsRoutes from './modules/camps/camps.routes.js';
import resourcesRoutes from './modules/resources/resources.routes.js';

const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'gestion-del-fin-api is alive and kicking!' });
});

app.use(express.json());
app.use('/api/system', systemRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/camps', campsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('DB connection closed. Shutting down gracefully...');
  process.exit(0);
});
