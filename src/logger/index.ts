import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'node:path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    stack ? `${timestamp} ${level}: ${message}\n${stack}` : `${timestamp} ${level}: ${message}`,
  ),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

const LOG_FILE = process.env.LOG_FILE || './logs/app.log';
const logDir = path.dirname(LOG_FILE);
const logBaseName = path.basename(LOG_FILE, path.extname(LOG_FILE));

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: `${logDir}/${logBaseName}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
    }),
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: 'error',
    }),
  ],
});
