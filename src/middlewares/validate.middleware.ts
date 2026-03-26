import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

export const validate =
  (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      next(error);
    }
  };
