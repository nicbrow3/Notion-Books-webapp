/**
 * Custom error classes for better error handling in serverless functions
 */

class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ExternalAPIError extends AppError {
  constructor(message, statusCode = 502, details = null) {
    super(message, statusCode, details);
    this.name = 'ExternalAPIError';
  }
}

/**
 * Error response formatter for consistent API responses
 */
const formatErrorResponse = (error) => {
  // Handle known application errors
  if (error.isOperational) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        error: error.message,
        details: error.details
      }
    };
  }

  // Handle Axios errors
  if (error.response) {
    return {
      statusCode: error.response.status,
      body: {
        success: false,
        error: 'External API error',
        details: error.response.data
      }
    };
  }

  // Handle validation errors (like Joi)
  if (error.name === 'ValidationError') {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Validation failed',
        details: error.details
      }
    };
  }

  // Generic error fallback
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    statusCode: 500,
    body: {
      success: false,
      error: isProduction ? 'Internal server error' : error.message,
      details: isProduction ? null : error.stack
    }
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ExternalAPIError,
  formatErrorResponse
};