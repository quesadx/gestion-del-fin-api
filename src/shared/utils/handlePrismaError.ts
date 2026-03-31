import { AppError } from './appError.js';

export function handleUniqueConstraintError(error: any): never {
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] ?? 'unique field';
    throw new AppError(`${field} already exists`, 409);
  }
  throw error;
}

export function handleForeignKeyError(error: any): never {
  if (error.code === 'P2003') {
    throw new AppError('Cannot delete record with related records', 409);
  }
  throw error;
}
