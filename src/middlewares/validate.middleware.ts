import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validate =
  (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (
        parsed &&
        typeof parsed === 'object' &&
        ('body' in parsed || 'params' in parsed || 'query' in parsed)
      ) {
        if ('body' in parsed) req.body = parsed.body;
        if ('params' in parsed) req.params = parsed.params as Request['params'];
        if ('query' in parsed) req.query = parsed.query as Request['query'];
      } else {
        req.body = parsed;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
