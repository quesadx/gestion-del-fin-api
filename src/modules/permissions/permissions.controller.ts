import { Request, Response } from 'express';
import {
  createPermission,
  deletePermission,
  getPermission,
  getPermissions,
  updatePermission,
} from './permissions.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createPermissionHandler(req: Request, res: Response) {
  const result = await createPermission(req.body);
  return res.status(201).json(result);
}

export async function updatePermissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updatePermission(id, req.body);
  return res.json(result);
}

export async function deletePermissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deletePermission(id);
  return res.status(204).send();
}

export async function getPermissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getPermission(id);
  return res.json(result);
}

export async function getPermissionsHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getPermissions(page, pageSize);
  return res.json(result);
}
