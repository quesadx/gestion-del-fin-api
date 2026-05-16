import { Request, Response } from 'express';
import { createRole, deleteRole, getRole, getRoles, updateRole } from './roles.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createRoleHandler(req: Request, res: Response) {
  const result = await createRole(req.body);
  return res.status(201).json(result);
}

export async function updateRoleHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateRole(id, req.body);
  return res.json(result);
}

export async function deleteRoleHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteRole(id);
  return res.status(204).send();
}

export async function getRoleHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getRole(id);
  return res.json(result);
}

export async function getRolesHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getRoles(page, pageSize);
  return res.json(result);
}
