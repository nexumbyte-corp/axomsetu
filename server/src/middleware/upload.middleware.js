import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Invalid file format. Only JPEG, PNG, WebP, and SVG images are allowed.'), false);
  }
};

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).single('logo');

/**
 * Middleware to validate magic bytes of uploaded memory buffer to prevent file extension spoofing.
 */
export const validateImageMagicBytes = (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return next();
  }

  const buffer = req.file.buffer;
  if (buffer.length < 4) {
    return next(ApiError.badRequest('Corrupted or invalid image file buffer'));
  }

  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  const isJpeg = hex.startsWith('FFD8FF');
  const isPng = hex === '89504E47';
  const isWebp = hex === '52494646'; // RIFF header
  const isSvg = buffer.toString('utf8', 0, 100).toLowerCase().includes('<svg');

  if (!isJpeg && !isPng && !isWebp && !isSvg) {
    return next(ApiError.badRequest('Uploaded file content does not match a valid image format'));
  }

  next();
};
