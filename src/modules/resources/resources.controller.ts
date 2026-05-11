import { Request, Response } from 'express';
import {
  createResource,
  updateResource,
  deleteResource,
  getResource,
  getResources,
} from './resources.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createResourceHandler(req: Request, res: Response) {
  const result = await createResource(req.body);
  return res.status(201).json(result);
}

export async function updateResourceHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateResource(id, req.body);
  return res.json(result);
}

export async function deleteResourceHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteResource(id);
  return res.status(204).send();
}

export async function getResourceHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getResource(id);
  return res.json(result);
}

export async function listResourcesHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getResources(page, pageSize);
  return res.json(result);
}
