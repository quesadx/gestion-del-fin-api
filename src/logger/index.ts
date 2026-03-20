import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/index.js';
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

const logDir = path.dirname(config.LOG_FILE);
const logBaseName = path.basename(config.LOG_FILE, path.extname(config.LOG_FILE));

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: config.NODE_ENV === 'production' ? prodFormat : devFormat,
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
