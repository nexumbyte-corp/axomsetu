import sharp from 'sharp';
import { cloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_TARGET_BYTES = 20 * 1024; // 20KB Max Target Size

/**
 * Extracts Cloudinary public_id from a Cloudinary secure_url string.
 * Example URL: https://res.cloudinary.com/demo/image/upload/v1620000000/school_saas/logos/sch_123.webp
 * Returns: "school_saas/logos/sch_123"
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    let pathWithVersion = parts[1];
    // Strip version prefix if present (e.g. v1620000000/)
    if (pathWithVersion.match(/^v\d+\//)) {
      pathWithVersion = pathWithVersion.replace(/^v\d+\//, '');
    }

    // Strip extension (.jpg, .png, .webp, etc.)
    const publicId = pathWithVersion.substring(0, pathWithVersion.lastIndexOf('.'));
    return publicId || null;
  } catch {
    return null;
  }
};

/**
 * Deletes an image asset from Cloudinary by URL or public_id.
 */
export const deleteCloudinaryImage = async (urlOrPublicId) => {
  if (!urlOrPublicId) return false;

  const publicId = urlOrPublicId.includes('http')
    ? extractPublicIdFromUrl(urlOrPublicId)
    : urlOrPublicId;

  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return result?.result === 'ok';
  } catch (err) {
    console.warn(`[Image Storage Warning] Failed to delete image asset "${publicId}":`, err.message);
    return false;
  }
};

/**
 * Compresses an image buffer to <= 20KB using sharp, then uploads to Cloudinary.
 *
 * @param {Buffer} inputBuffer - Input image file buffer
 * @param {string} originalMimeType - Mimetype (e.g., 'image/png')
 * @param {string} folder - Destination folder in Cloudinary
 * @returns {Promise<{ secure_url: string, public_id: string, bytes: number }>}
 */
export const compressAndUploadLogo = async (inputBuffer, originalMimeType, folder = 'school_saas/logos') => {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw ApiError.badRequest('No image file buffer provided');
  }

  let compressedBuffer = inputBuffer;
  const isStudentPhoto = folder.includes('students') || originalMimeType.includes('jpeg') || originalMimeType.includes('jpg');

  // Perform sharp compression for bitmap images (PNG, JPEG, WebP)
  if (originalMimeType !== 'image/svg+xml') {
    if (isStudentPhoto) {
      let width = 500;
      let quality = 88;
      let attempts = 0;

      while (attempts < 8) {
        compressedBuffer = await sharp(inputBuffer)
          .resize({ width, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
          .toBuffer();

        if (compressedBuffer.length <= MAX_TARGET_BYTES) {
          break;
        }

        if (quality > 65) {
          quality -= 5;
        } else {
          width = Math.max(180, width - 40);
        }
        attempts++;
      }
    } else {
      let width = 300;
      let attempts = 0;

      while (attempts < 5) {
        compressedBuffer = await sharp(inputBuffer)
          .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
          .png({ compressionLevel: 9, palette: true })
          .toBuffer();

        if (compressedBuffer.length <= MAX_TARGET_BYTES) {
          break;
        }

        width = Math.max(120, width - 40);
        attempts++;
      }
    }
  }

  // Check if Cloudinary credentials are validly configured
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const isCloudinaryConfigured =
    cloudName &&
    cloudName !== 'demo_cloud_name' &&
    cloudName !== 'your_cloud_name' &&
    apiKey &&
    apiKey !== 'demo_api_key' &&
    apiKey !== 'your_api_key';

  const mimePrefix = isStudentPhoto ? 'image/jpeg' : 'image/png';

  if (!isCloudinaryConfigured) {
    // Fallback to compressed Data URI (<=20KB) which pdfmake natively supports
    const base64Data = `data:${mimePrefix};base64,${compressedBuffer.toString('base64')}`;
    return {
      secure_url: base64Data,
      public_id: null,
      bytes: compressedBuffer.length,
    };
  }

  // Upload compressed buffer to Cloudinary stream
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          console.error('[Image Storage Error]:', error.message);
          return reject(ApiError.badRequest(`Failed to upload image: ${error.message}`));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(compressedBuffer);
  });
};
