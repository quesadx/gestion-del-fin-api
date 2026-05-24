import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../shared/utils/appError.js';
import { logger } from '../logger/logger.js';

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002':
      return { statusCode: 409, message: 'Unique constraint violation' };
    case 'P2003':
      return { statusCode: 400, message: 'Foreign key constraint violation' };
    case 'P2025':
      return { statusCode: 404, message: 'Record not found' };
    default:
      return { statusCode: 400, message: 'Database operation failed' };
  }
}

function sendErrorResponse(res: Response, statusCode: number, message: string, details?: unknown) {
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      details,
    },
  });
}

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendErrorResponse(res, error.statusCode, error.message);
    return;
  }

  if (error instanceof ZodError) {
    sendErrorResponse(res, 400, 'Validation failed', error.issues);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(error);
    sendErrorResponse(res, mapped.statusCode, mapped.message, error.meta);
    return;
  }

  if (typeof error?.statusCode === 'number' && typeof error?.message === 'string') {
    sendErrorResponse(res, error.statusCode, error.message);
    return;
  }

  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error?.message;

  logger.error('Unhandled error', {
    method: req.method,
    url: req.originalUrl,
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
  });

  sendErrorResponse(res, statusCode, message ?? 'Internal Server Error');
}
