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

const resolveLogPaths = () => {
  const file = process.env.LOG_FILE || './logs/app.log';
  return {
    dir: path.dirname(file),
    baseName: path.basename(file, path.extname(file)),
  };
};

const paths = resolveLogPaths();

const coreTransports = [
  new winston.transports.Console(),
  new DailyRotateFile({
    filename: `${paths.dir}/${paths.baseName}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
  }),
  new DailyRotateFile({
    filename: `${paths.dir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    level: 'error',
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: coreTransports,
});
