const jwt = require('jsonwebtoken');

class AuthToken {
  constructor() {
    this.secret = process.env.AUTH_COOKIE_SECRET || process.env.SESSION_SECRET || 'fallback-secret-key';
    this.cookieName = 'auth-token';
    this.expiresIn = '24h'; // 24 hour expiry
  }

  /**
   * Create a signed JWT token containing user data
   * @param {Object} userData - User data to encode in token
   * @param {string} userData.userId - User ID
   * @param {string} userData.notionUserId - Notion user ID
   * @param {string} userData.notionToken - Notion integration token
   * @param {Object} userData.userData - Additional user profile data
   * @returns {string} Signed JWT token
   */
  signToken(userData) {
    const payload = {
      userId: userData.userId,
      notionUserId: userData.notionUserId,
      notionToken: userData.notionToken,
      userData: userData.userData,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Extract token from request cookies or Authorization header
   * @param {Object} req - Request object
   * @returns {string|null} Token string or null if not found
   */
  extractTokenFromRequest(req) {
    // Check cookies first (primary method)
    if (req.cookies && req.cookies[this.cookieName]) {
      return req.cookies[this.cookieName];
    }

    // Fallback to Authorization header for API clients
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Set authentication cookie in response
   * @param {Object} res - Response object
   * @param {string} token - JWT token to set
   */
  setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(this.cookieName, token, {
      httpOnly: true, // Prevent XSS attacks
      secure: isProduction && !process.env.DISABLE_SECURE_COOKIES, // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: '/' // Available on all routes
    });
  }

  /**
   * Clear authentication cookie
   * @param {Object} res - Response object
   */
  clearAuthCookie(res) {
    res.clearCookie(this.cookieName, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !process.env.DISABLE_SECURE_COOKIES,
      sameSite: 'lax'
    });
  }

  /**
   * Middleware to authenticate requests using JWT tokens
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  requireAuth(req, res, next) {
    const token = this.extractTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = this.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach decoded user data to request object (mimicking session structure)
    req.user = {
      userId: decoded.userId,
      notionUserId: decoded.notionUserId,
      notionToken: decoded.notionToken,
      userData: decoded.userData
    };

    // For backward compatibility, also attach to req.session-like structure
    req.session = {
      userId: decoded.userId,
      notionUserId: decoded.notionUserId,
      notionToken: decoded.notionToken,
      userData: decoded.userData
    };

    next();
  }

  /**
   * Get the Notion token from request (either from token or environment)
   * @param {Object} req - Request object with user data
   * @returns {string} Notion integration token
   */
  getNotionToken(req) {
    // Try token from user session first
    if (req.user && req.user.notionToken) {
      return req.user.notionToken;
    }

    // Try legacy session structure
    if (req.session && req.session.notionToken) {
      return req.session.notionToken;
    }

    // Fallback to environment variable for personal use
    if (process.env.NOTION_INTEGRATION_TOKEN) {
      return process.env.NOTION_INTEGRATION_TOKEN;
    }

    throw new Error('No Notion token available');
  }
}

module.exports = new AuthToken();