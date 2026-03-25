import { Request, Response } from 'express';
import { createCamp, updateCamp, deleteCamp, getCamp, getAllCamps } from './camps.service.js';
import { AppError } from '../../shared/utils/appError.js';

function parseIdParam(rawId: string | string[] | undefined): number {
  const value = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('id must be a positive integer', 400);
  }
  return id;
}

export async function createCampHandler(req: Request, res: Response) {
  try {
    const result = await createCamp(req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function updateCampHandler(req: Request, res: Response) {
  try {
    const id = parseIdParam(req.params.id);
    const result = await updateCamp(id, req.body);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function deleteCampHandler(req: Request, res: Response) {
  try {
    const id = parseIdParam(req.params.id);
    await deleteCamp(id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function getCampHandler(req: Request, res: Response) {
  try {
    const id = parseIdParam(req.params.id);
    const result = await getCamp(id);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function listCampsHandler(req: Request, res: Response) {
  try {
    const result = await getAllCamps();
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}
