import { PassThrough } from 'node:stream';
import { AppError } from '../shared/utils/appError.js';
import { cloudinary, isCloudinaryConfigured } from './cloudinary-provider.js';

type UploadOptions = {
  folder: string;
  publicId?: string;
};

type CloudinaryUploadResult = {
  secureUrl: string;
  deliveryUrl: string;
  publicId: string;
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
};

export function assertCloudinaryConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new AppError('Cloudinary is not configured', 500);
  }
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadOptions,
): Promise<CloudinaryUploadResult> {
  assertCloudinaryConfigured();

  return await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: 'image',
        type: 'authenticated',
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(new AppError('Cloudinary upload failed', 502));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          deliveryUrl: cloudinary.url(result.public_id, {
            secure: true,
            resource_type: 'image',
            type: 'authenticated',
            version: result.version,
          }),
          publicId: result.public_id,
          bytes: result.bytes ?? 0,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      },
    );

    const bufferStream = new PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
}
