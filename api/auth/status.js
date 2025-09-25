const { withMiddleware } = require('../_middleware/handler');
const { checkAuthStatus } = require('../../backend/src/handlers/auth/status');
const { optionalAuth } = require('../_middleware/auth');
const authToken = require('../../backend/src/utils/authToken');

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply optional authentication
  optionalAuth(req, res, async () => {
    try {
      const integrationToken = process.env.NOTION_INTEGRATION_TOKEN;

      const result = await checkAuthStatus({
        user: req.user,
        integrationToken
      });

      // If auto-authentication occurred, set cookie
      if (result.userSession) {
        const token = authToken.signToken(result.userSession);
        authToken.setAuthCookie(res, token);
      }

      // Remove userSession from response
      const { userSession, ...responseData } = result;

      return res.status(200).json(responseData);

    } catch (error) {
      throw error; // Let middleware handle error formatting
    }
  });
};

module.exports = withMiddleware(handler);