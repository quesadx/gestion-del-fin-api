import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { logger } from '../logger/logger.js';
import { AppError } from '../shared/utils/appError.js';

function mapPrismaKnownRequestError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : 'unique field';
      return new AppError(`${field} already exists`, 409);
    }

    case 'P2003': {
      return new AppError('Cannot delete record with related records', 409);
    }

    case 'P2025': {
      return new AppError('Record not found', 404);
    }

    default: {
      return new AppError('Database request failed', 400);
    }
  }
}

function sendErrorResponse(res: Response, statusCode: number, message: string, details?: unknown) {
  return res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(details ? { details } : {}),
    },
  });
}

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return sendErrorResponse(res, error.statusCode, error.message);
  }

  if (error instanceof ZodError) {
    return sendErrorResponse(res, 400, 'Validation error', error.issues);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mappedError = mapPrismaKnownRequestError(error);
    return sendErrorResponse(res, mappedError.statusCode, mappedError.message);
  }

  if (typeof error?.statusCode === 'number' && typeof error?.message === 'string') {
    return sendErrorResponse(res, error.statusCode, error.message);
  }

  logger.error('Unhandled error', {
    method: req.method,
    url: req.originalUrl,
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction
    ? 'Internal Server Error'
    : error?.message || 'Internal Server Error';

  return sendErrorResponse(res, 500, message);
}
