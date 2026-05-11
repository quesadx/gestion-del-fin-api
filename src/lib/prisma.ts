import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

const resolveDbConfig = () => {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || password === undefined || !database) {
    throw new Error(
      'Missing DB config. Define DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in the environment variables.',
    );
  }

  return { host, port, user, password, database };
};

const db = resolveDbConfig();

const adapter = new PrismaMariaDb({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

export { prisma };
