import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Invalid file format. Only JPEG, PNG, and WebP raster images are allowed.'), false);
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadSingleImage = (req, res, next) => {
  multerInstance.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file =
        req.files.logo?.[0] ||
        req.files.photo?.[0] ||
        req.files.file?.[0] ||
        req.files.image?.[0] ||
        null;
    }
    next();
  });
};

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

  if (!isJpeg && !isPng && !isWebp) {
    return next(ApiError.badRequest('Uploaded file content does not match a valid JPEG, PNG, or WebP image format'));
  }

  next();
};
