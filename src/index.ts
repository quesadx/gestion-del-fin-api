import { config } from './config/index.js';
import { logger } from './logger/index.js';
import { prisma } from './lib/prisma.js';
import express from 'express';
import { systemRoutes } from './modules/system/system.routes.js';

const app = express();

// Routes always go before listening
app.get('/', (req, res) => {
  res.json({ message: 'gestion-del-fin-api is alive!' });
});
app.use('/api/system', systemRoutes);

// Graceful shutdown hahaha
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('DB connection closed. Shutting down gracefully...');
  process.exit(0);
});

app.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});
