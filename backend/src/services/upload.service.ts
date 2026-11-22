import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env';
import { AppError } from '../utils/AppError';

const isConfigured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

// Multer gives us the file as a Buffer in memory; we stream it to Cloudinary.
function uploadBuffer(buffer: Buffer, filename: string): Promise<{ url: string; publicId: string }> {
  if (!isConfigured) throw new AppError(503, 'File uploads are not configured');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'task-portal', resource_type: 'auto', use_filename: true, filename_override: filename },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

async function deleteFile(publicId: string): Promise<void> {
  if (!isConfigured) return;
  await cloudinary.uploader.destroy(publicId);
}

// Exported as an object so tests can jest.spyOn(uploadService, '...').
export default { uploadBuffer, deleteFile };
