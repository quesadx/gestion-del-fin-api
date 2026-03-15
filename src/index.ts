import express from 'express';
import { systemRoutes } from './modules/system/system.routes.js';
import { prisma } from './lib/prisma.js';

const app = express();
const DEFAULT_PORT = 3000;

// Prefer a valid positive integer from env; otherwise fall back to the default
const PORT = (() => {
  const parsed = Number(process.env.PORT);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    if (process.env.PORT) {
      console.warn(`Invalid PORT "${process.env.PORT}", falling back to ${DEFAULT_PORT}`);
    }
    return DEFAULT_PORT;
  }
  return parsed;
})();

app.get('/', (req, res) => {
  res.json({ message: 'gestion-del-fin-api is alive!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Gotta do this for each module, or else the routes won't be registered
app.use('/api/system', systemRoutes);
