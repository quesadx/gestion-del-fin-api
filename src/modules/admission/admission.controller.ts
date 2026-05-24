import { Request, Response } from 'express';
import { CreateAdmissionDTO, reviewAdmissionSchema } from './admission.schema.js';
import * as service from './admission.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { signMediaUrls } from '../../shared/utils/mediaUrl.js';
import { AppError } from '../../shared/utils/appError.js';

export async function createAdmissionHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const body = req.body as CreateAdmissionDTO;
  const campId = parseIdParam(req.params.campId);
  const createdBy = authReq.user?.userId;
  if (!createdBy) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await service.createAdmission(campId, body, createdBy);
  res.status(201).json(signMediaUrls(result, authReq.user?.exp));
}

export async function getAdmissionsHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await service.getAdmissions(campId, page, pageSize);
  res.json(signMediaUrls(result, (req as AuthenticatedRequest).user?.exp));
}

export async function getAdmissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await service.getAdmissionsById(id);
  res.json(signMediaUrls(result, (req as AuthenticatedRequest).user?.exp));
}

export async function reviewAdmissionHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const reviewedBy = authReq.user.userId;
  const body = reviewAdmissionSchema.parse(req.body);

  const result = await service.reviewAdmission(id, reviewedBy, body);
  res.json(signMediaUrls(result, authReq.user?.exp));
}
