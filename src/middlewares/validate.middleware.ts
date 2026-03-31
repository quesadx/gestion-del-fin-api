import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validate =
  (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
