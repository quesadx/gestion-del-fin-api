import { Request, Response } from 'express';
import { createAdmissionSchema, reviewAdmissionSchema } from './admission.schema.js';
import * as service from './admission.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function create(req: Request, res: Response) {
  const body = createAdmissionSchema.parse(req.body);
  const campId = parseIdParam(req.params.campId);

  const result = await service.createAdmission(campId, body);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const result = await service.getAdmissions(campId);
  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await service.getAdmissionsById(id);
  res.json(result);
}

export async function review(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  //const reviewedBy = req.user.id;
  const body = reviewAdmissionSchema.parse(req.body);

  //const result = await service.reviewAdmission(id, reviewedBy, body);
  //res.json(result);
}
