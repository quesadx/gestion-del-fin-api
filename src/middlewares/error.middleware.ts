import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/logger.js';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  if (statusCode === 500) {
    logger.error('Unhandled error', { statusCode, message, stack: error.stack });
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
    },
  });
}
