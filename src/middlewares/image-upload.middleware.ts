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

    multerFields(req, res, async (error) => {
      if (error) {
        next(error);
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
        next(uploadError);
      }
    });
  };
}
