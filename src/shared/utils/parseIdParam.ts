import { AppError } from './appError.js';

export function parseIdParam(rawId: string | string[] | undefined): number {
  const value = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('id must be a positive integer', 400);
  }
  return id;
}
