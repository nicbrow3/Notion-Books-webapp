const { corsMiddleware } = require('./cors');
const { formatErrorResponse } = require('../../backend/src/lib/errors');

/**
 * Wrapper for Vercel functions with common middleware
 * @param {Function} handler - The main handler function
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether authentication is required
 * @returns {Function} Wrapped Vercel function
 */
const withMiddleware = (handler, options = {}) => {
  return async (req, res) => {
    try {
      // Apply CORS
      corsMiddleware(req, res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Call the main handler
      const result = await handler(req, res);

      // If handler didn't send response, send the result
      if (!res.headersSent && result !== undefined) {
        return res.status(200).json(result);
      }

    } catch (error) {
      console.error('Handler error:', error);

      // Format error response
      const errorResponse = formatErrorResponse(error);

      // Send error response if not already sent
      if (!res.headersSent) {
        return res.status(errorResponse.statusCode).json(errorResponse.body);
      }
    }
  };
};

module.exports = {
  withMiddleware
};