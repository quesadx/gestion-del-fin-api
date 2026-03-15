import express from 'express';
// import { prisma } from './lib/prisma';

const app = express();
const DEFAULT_PORT = 3000;
const rawPort = process.env.PORT;
const PORT = (() => {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }
  const parsed = Number(rawPort);
  if (Number.isNaN(parsed)) {
    console.warn(`Invalid PORT "${rawPort}", falling back to ${DEFAULT_PORT}`);
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