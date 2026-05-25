import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { uploadBufferToCloudinary } from '../lib/cloudinary.js';

type ImageUploadField = {
  fieldName: string;
  targetBodyKey: string;
  folder: string;
};

type MultipartFiles = Record<string, Express.Multer.File[]>;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export function createImageUploadMiddleware(fields: ImageUploadField[]) {
  const multerFields = memoryUpload.fields(
    fields.map((field) => ({ name: field.fieldName, maxCount: 1 })),
  );

  return async function imageUploadMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.is('multipart/form-data')) {
      next();
      return;
    }

    // Track if request was aborted by client
    let requestAborted = false;
    const onAbort = () => {
      requestAborted = true;
    };

    req.on('aborted', onAbort);
    res.on('close', () => {
      if (!res.writableEnded) {
        requestAborted = true;
      }
    });

    multerFields(req, res, async (error) => {
      req.removeListener('aborted', onAbort);

      // Silently handle client abort errors (request disconnected during upload)
      if (error && (error.message === 'Request aborted' || error.code === 'ABORTED')) {
        return; // Client disconnected, no need to send response
      }

      if (error) {
        next(error);
        return;
      }

      // Don't process if request was aborted
      if (requestAborted) {
        return;
      }

      try {
        const files = (req.files ?? {}) as MultipartFiles;

        await Promise.all(
          fields.map(async (field) => {
            const file = files[field.fieldName]?.[0];
            if (!file) {
              return;
            }

            const uploadResult = await uploadBufferToCloudinary(file.buffer, {
              folder: field.folder,
            });

            req.body[field.targetBodyKey] = uploadResult.secureUrl;
          }),
        );

        next();
      } catch (uploadError) {
        // Don't process if request was aborted
        if (!requestAborted) {
          next(uploadError);
        }
      }
    });
  };
}
