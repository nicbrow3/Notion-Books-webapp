const authToken = require('../../backend/src/utils/authToken');
const { formatErrorResponse, AuthenticationError } = require('../../backend/src/lib/errors');

/**
 * Authentication middleware for Vercel functions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function (optional)
 * @returns {Object|void} User data or void if next is provided
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = authToken.extractTokenFromRequest(req);

    if (!token) {
      if (next) {
        // For optional auth, continue without user
        req.user = null;
        return next();
      } else {
        throw new AuthenticationError('Authentication required');
      }
    }

    const decoded = authToken.verifyToken(token);
    if (!decoded) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Attach decoded user data to request object
    req.user = {
      userId: decoded.userId,
      notionUserId: decoded.notionUserId,
      notionToken: decoded.notionToken,
      userData: decoded.userData
    };

    if (next) {
      next();
    } else {
      return req.user;
    }

  } catch (error) {
    if (next) {
      // For middleware chain, handle error
      const errorResponse = formatErrorResponse(error);
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    } else {
      // For direct usage, throw error
      throw error;
    }
  }
};

/**
 * Require authentication (throws if not authenticated)
 */
const requireAuth = (req, res) => {
  return authMiddleware(req, res, null);
};

/**
 * Optional authentication (continues if not authenticated)
 */
const optionalAuth = (req, res, next) => {
  return authMiddleware(req, res, next);
};

module.exports = {
  authMiddleware,
  requireAuth,
  optionalAuth
};