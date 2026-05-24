import { Request, Response } from 'express';
import { createUser, deleteUser, getUsers, getUser, updateUser } from './users.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';

export async function createUserHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const result = await createUser(req.body, authReq.user.userId, authReq.user.campId);
  return res.status(201).json(result);
}

export async function updateUserHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await updateUser(id, req.body, authReq.user.userId, authReq.user.campId);
  return res.json(result);
}

export async function deleteUserHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  await deleteUser(id, authReq.user.userId, authReq.user.campId);
  return res.status(204).send();
}

export async function getUserHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getUser(id);
  return res.json(result);
}

export async function getUsersHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  // Use DB-verified admin bypass status (set by campMiddleware) instead of
  // the stale JWT isAdmin flag which may be outdated after permission revocation.
  const campId = (req as any)._hasAdminBypass ? 0 : authReq.user.campId;
  const result = await getUsers(campId, page, pageSize);
  return res.json(result);
}
