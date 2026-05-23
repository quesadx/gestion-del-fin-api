import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validate =
  (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If the request is multipart/form-data, form fields arrive as strings.
      // Coerce common scalar types so Zod schemas expecting numbers/booleans pass.
      function coerceMultipartValues(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;
        const out: any = Array.isArray(obj) ? [] : {};
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (/^-?\d+$/.test(trimmed)) {
              out[key] = Number.parseInt(trimmed, 10);
              continue;
            }
            if (/^-?\d*\.\d+$/.test(trimmed)) {
              out[key] = Number.parseFloat(trimmed);
              continue;
            }
            if (/^(true|false)$/i.test(trimmed)) {
              out[key] = trimmed.toLowerCase() === 'true';
              continue;
            }
            out[key] = val;
            continue;
          }
          if (typeof val === 'object' && val !== null) out[key] = coerceMultipartValues(val);
          else out[key] = val;
        }
        return out;
      }

      if (req.is && req.is('multipart/form-data')) {
        req.body = coerceMultipartValues(req.body);
      }
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
