const { withMiddleware } = require('../_middleware/handler');
const { setupNotionIntegration } = require('../../backend/src/handlers/auth/setup');
const authToken = require('../../backend/src/utils/authToken');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For personal use, we'll use the integration token from environment variables
    const integrationToken = process.env.NOTION_INTEGRATION_TOKEN;

    const result = await setupNotionIntegration({ integrationToken });

    if (result.userSession) {
      // Create JWT token with user data
      const token = authToken.signToken(result.userSession);

      // Set authentication cookie
      authToken.setAuthCookie(res, token);
    }

    // Remove userSession from response (it's in the cookie now)
    const { userSession, ...responseData } = result;

    return responseData;

  } catch (error) {
    throw error; // Let middleware handle error formatting
  }
};

module.exports = withMiddleware(handler);