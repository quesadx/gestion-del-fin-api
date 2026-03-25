import { Request, Response } from 'express';
import { createCamp, updateCamp, deleteCamp, getCamp, getAllCamps } from './camps.service.js';

export async function createCampHandler(req: Request, res: Response) {
  try {
    const camp = await createCamp(req.body);
    return res.status(201).json(camp);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function updateCampHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const camp = await updateCamp(id, req.body);
    return res.json(camp);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function deleteCampHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await deleteCamp(id);
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
    const camp = await getCamp(id);
    if (!camp) return res.status(404).json({ error: 'Camp not found' });
    return res.json(camp);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export async function listCampsHandler(req: Request, res: Response) {
  try {
    const camps = await getAllCamps();
    return res.json(camps);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error',
    });
  }
}
