const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  let error = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  };

  // Database errors
  if (err.code === '23505') {
    error = {
      success: false,
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY'
    };
  }

  if (err.code === '23503') {
    error = {
      success: false,
      error: 'Referenced record not found',
      code: 'FOREIGN_KEY_VIOLATION'
    };
  }

  if (err.code === '23502') {
    error = {
      success: false,
      error: 'Required field missing',
      code: 'NOT_NULL_VIOLATION'
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      success: false,
      error: err.message,
      code: 'VALIDATION_ERROR'
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = {
      success: false,
      error: 'CORS policy violation',
      code: 'CORS_ERROR'
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  // Send error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(error);
};

module.exports = { errorHandler };