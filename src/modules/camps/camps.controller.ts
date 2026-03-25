import { Request, Response } from 'express';
import { createCampSchema, updateCampSchema } from './camps.schema.js';
import { createCamp, updateCamp, deleteCamp, getCamp, getAllCamps } from './camps.service.js';

export async function createCampHandler(req: Request, res: Response) {
  const parsed = createCampSchema.parse(req.body);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  try {
    const result = await createCamp(parsed);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function updateCampHandler(req: Request, res: Response) {
  const parsed = updateCampSchema.parse(req.body);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  const id = Number(req.params.id);
  try {
    const result = await updateCamp(id, parsed);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function deleteCampHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const result = await deleteCamp(id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function getCampHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const result = await getCamp(id);
    if (!result) return res.status(404).json({ error: 'Camp not found' });
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
