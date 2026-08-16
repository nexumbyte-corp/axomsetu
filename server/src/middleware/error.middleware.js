import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Standardize error instance
  if (error.name === 'ZodError') {
    const formattedErrors = (error.errors || []).map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', formattedErrors);
  } else if (error.code === 'P2023') {
    error = ApiError.badRequest('Invalid parameter format or identifier.');
  } else if (error.code === 'P2025') {
    error = ApiError.notFound('Requested record not found.');
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'UnauthorizedError' ? 401 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], false, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(error.code && { code: error.code }),
    errors: error.errors || [],
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};
