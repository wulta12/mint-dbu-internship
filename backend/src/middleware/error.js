// Centralized error handling helpers.

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// 404 handler for unknown routes
const notFound = (req, res, next) => {
  next(new ApiError(404, 'Resource not found'));
};

// Centralized error handler
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = { ApiError, notFound, errorHandler };
