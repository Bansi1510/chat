import { v2 as cloudinary } from 'cloudinary';
import { getSettings } from '../admin/settings.service';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }
}

export async function generateUploadSignature(
  userId: string,
  folder = 'secure_chat'
) {
  const settings = await getSettings();
  const maxLimitMb = (settings?.maxFileSizeMb as number) || 25;

  const timestamp = Math.round(new Date().getTime() / 1000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
  const apiKey = process.env.CLOUDINARY_API_KEY || 'demo_key';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'demo_secret';

  const paramsToSign = {
    folder: `${folder}/${userId}`,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder: `${folder}/${userId}`,
    maxFileSizeMb: maxLimitMb,
  };
}

export async function verifyMediaUpload(
  fileSizeBytes: number,
  fileType: string
) {
  const settings = await getSettings();
  const maxLimitMb = (settings?.maxFileSizeMb as number) || 25;
  const maxBytes = maxLimitMb * 1024 * 1024;

  if (fileSizeBytes > maxBytes) {
    throw AppError.badRequest(
      `File size exceeds maximum allowed limit of ${maxLimitMb} MB`,
      'FILE_TOO_LARGE'
    );
  }

  const allowedTypes = [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'text/plain',
  ];

  const isAllowed = allowedTypes.some((type) => fileType.startsWith(type));
  if (!isAllowed) {
    throw AppError.badRequest('File type is not permitted', 'INVALID_FILE_TYPE');
  }

  return { verified: true };
}

/**
 * Extracts Cloudinary publicId from asset URL if not stored explicitly.
 */
export function extractPublicIdFromUrl(fileUrl: string): string | null {
  try {
    const urlObj = new URL(fileUrl);
    const parts = urlObj.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // After upload: [version (e.g. v1234567), folder1, folder2, filename.ext]
    const afterUpload = parts.slice(uploadIndex + 1);
    const pathParts = afterUpload[0]?.startsWith('v') && /^\d+$/.test(afterUpload[0].substring(1))
      ? afterUpload.slice(1)
      : afterUpload;

    const fullPathWithExt = pathParts.join('/');
    const lastDotIndex = fullPathWithExt.lastIndexOf('.');
    return lastDotIndex !== -1 ? fullPathWithExt.substring(0, lastDotIndex) : fullPathWithExt;
  } catch {
    return null;
  }
}

/**
 * Permanently deletes media file from Cloudinary storage.
 */
export async function deleteCloudinaryMedia(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' | string = 'image'
): Promise<boolean> {
  configureCloudinary();

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: (resourceType === 'document' ? 'raw' : resourceType) as any,
      invalidate: true,
    });
    const success = res.result === 'ok' || res.result === 'not found';
    if (!success) {
      logger.warn({ res, publicId }, 'Cloudinary destroy returned non-ok result');
    }
    return success;
  } catch (error) {
    logger.error({ error, publicId }, 'Failed to delete asset from Cloudinary');
    return false;
  }
}
