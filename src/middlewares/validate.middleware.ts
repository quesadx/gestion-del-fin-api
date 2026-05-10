import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validate =
  (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodyParseResult = await schema.safeParseAsync(req.body);
      if (bodyParseResult.success) {
        req.body = bodyParseResult.data;
        next();
        return;
      }

      const requestParseResult = await schema.safeParseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (!requestParseResult.success) {
        throw requestParseResult.error;
      }

      const parsed = requestParseResult.data;

      if (
        parsed &&
        typeof parsed === 'object' &&
        ('body' in parsed || 'params' in parsed || 'query' in parsed)
      ) {
        if ('body' in parsed) req.body = parsed.body;
        if ('query' in parsed) {
          Object.defineProperty(req, 'query', {
            value: parsed.query,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        if ('params' in parsed) (req as any).params = parsed.params;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
